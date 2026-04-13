"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyLicenceExpiry = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const mailer_js_1 = require("./mailer.js");
(0, app_1.initializeApp)();
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
exports.notifyLicenceExpiry = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *',
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
}, async () => {
    const db = (0, firestore_1.getFirestore)();
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
//# sourceMappingURL=index.js.map