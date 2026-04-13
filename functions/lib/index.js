"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishScheduledActualites = exports.notifyLicenceExpiry = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const mailer_js_1 = require("./mailer.js");
(0, app_1.initializeApp)();
function getRuntimeProjectId() {
    return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
}
function getRuntimeDb() {
    const projectId = getRuntimeProjectId();
    if (projectId) {
        return (0, firestore_1.getFirestore)(projectId);
    }
    return (0, firestore_1.getFirestore)();
}
function toDate(value) {
    if (!value)
        return null;
    if (value instanceof firestore_1.Timestamp)
        return value.toDate();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed;
}
function toYyyyMmDd(date) {
    return date.toISOString().slice(0, 10);
}
function addOneYear(date) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + 1);
    return next;
}
function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
async function sendActualiteNotification(infoId, info) {
    const db = getRuntimeDb();
    const communeId = info.commune_id;
    if (!communeId) {
        return 0;
    }
    const tokenSnap = await db
        .collection('push_token')
        .where('commune_id', '==', communeId)
        .get();
    const tokens = tokenSnap.docs
        .map((d) => d.data())
        .filter((row) => row.is_active !== false && typeof row.token === 'string' && row.token.length > 0)
        .map((row) => row.token);
    if (!tokens.length) {
        return 0;
    }
    const messaging = (0, messaging_1.getMessaging)();
    let sent = 0;
    for (let i = 0; i < tokens.length; i += 500) {
        const chunk = tokens.slice(i, i + 500);
        const result = await messaging.sendEachForMulticast({
            tokens: chunk,
            notification: {
                title: String(info.category || ''),
                body: String(info.title || '')
            },
            data: {
                type: 'actualite',
                info_id: infoId,
                commune_id: String(communeId),
                campaign_key: `actualite_${infoId}`
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default'
                }
            },
            apns: {
                headers: { 'apns-priority': '10' },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        });
        sent += result.successCount;
    }
    return sent;
}
exports.notifyLicenceExpiry = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
}, async () => {
    const db = getRuntimeDb();
    const now = new Date();
    const targetExpiration = toYyyyMmDd(addDays(now, 45));
    const snapshot = await db.collection('commune').get();
    let sentCount = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const licenceDate = toDate(data.date_licence);
        if (!licenceDate)
            continue;
        const expirationDate = addOneYear(licenceDate);
        const expirationYyyyMmDd = toYyyyMmDd(expirationDate);
        if (expirationYyyyMmDd !== targetExpiration)
            continue;
        if (data.license_renewal_notified_for_expiration === expirationYyyyMmDd) {
            continue;
        }
        const mailResult = await (0, mailer_js_1.sendLicenceExpiryAlertEmail)({
            communeId: doc.id,
            name: data.name || '(sans nom)',
            postalCode: data.postal_code || '(inconnu)',
            email: data.email || '(inconnu)',
            logoUrl: data.logo_url || null,
            dateLicence: toYyyyMmDd(licenceDate),
            dateExpiration: expirationYyyyMmDd,
        });
        if (!mailResult.success) {
            firebase_functions_1.logger.error('Echec envoi alerte licence', {
                communeId: doc.id,
                error: mailResult.error,
            });
            continue;
        }
        sentCount += 1;
        await doc.ref.update({
            license_renewal_notified_for_expiration: expirationYyyyMmDd,
            license_renewal_last_notified_at: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    firebase_functions_1.logger.info('Alerte licences terminee', {
        targetExpiration,
        communesScanned: snapshot.size,
        sentCount,
    });
});
exports.publishScheduledActualites = (0, scheduler_1.onSchedule)({
    schedule: '0 * * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
}, async () => {
    try {
        const db = getRuntimeDb();
        const now = new Date();
        const nowIso = now.toISOString();
        const scheduledSnap = await db
            .collection('actualite')
            .where('publication_status', '==', 'scheduled')
            .get();
        const dueDocs = scheduledSnap.docs.filter((doc) => {
            const data = doc.data();
            if (!data.scheduled_publish_at)
                return false;
            const scheduledAt = new Date(data.scheduled_publish_at);
            return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() <= now.getTime();
        });
        let publishedCount = 0;
        let notifiedCount = 0;
        let skippedAlreadyNotified = 0;
        let publishErrors = 0;
        let notifyErrors = 0;
        for (const scheduledDoc of dueDocs) {
            const info = scheduledDoc.data();
            if (info.notification_sent_at) {
                skippedAlreadyNotified += 1;
                continue;
            }
            try {
                await scheduledDoc.ref.update({
                    publication_status: 'published',
                    published_at: nowIso,
                    updated_at: firestore_1.FieldValue.serverTimestamp(),
                });
                publishedCount += 1;
            }
            catch (error) {
                publishErrors += 1;
                firebase_functions_1.logger.error('Echec mise a jour publication actualite', {
                    infoId: scheduledDoc.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                continue;
            }
            try {
                const sent = await sendActualiteNotification(scheduledDoc.id, info);
                await scheduledDoc.ref.update({
                    notification_sent_at: new Date().toISOString(),
                    updated_at: firestore_1.FieldValue.serverTimestamp(),
                });
                notifiedCount += sent;
            }
            catch (error) {
                notifyErrors += 1;
                firebase_functions_1.logger.error('Echec notification actualite programmee', {
                    infoId: scheduledDoc.id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        firebase_functions_1.logger.info('Publication programmee actualites terminee', {
            projectId: getRuntimeProjectId() || '(unknown)',
            scheduledFound: scheduledSnap.size,
            dueCount: dueDocs.length,
            publishedCount,
            notifiedCount,
            skippedAlreadyNotified,
            publishErrors,
            notifyErrors,
        });
    }
    catch (error) {
        firebase_functions_1.logger.error('Erreur scheduler publication actualites', {
            projectId: getRuntimeProjectId() || '(unknown)',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
//# sourceMappingURL=index.js.map