/**
 * Utilitaire pour l'authentification FCM v1 avec OAuth 2.0
 * Utilise un compte de service JSON pour obtenir un token d'accès
 *
 * Note: Cette implémentation utilise l'API REST directement.
 * Pour une solution plus robuste, considérez utiliser firebase-admin SDK.
 */

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Charge le compte de service depuis les variables d'environnement
 */
async function loadServiceAccount(): Promise<ServiceAccount> {
  // Option 1: Depuis une variable d'environnement JSON stringifiée
  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;

  // Option 2: Depuis un chemin vers un fichier JSON
  const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;

  let serviceAccount: any;

  if (serviceAccountJson) {
    try {
      let jsonToParse = serviceAccountJson.trim();

      // Handle cases where the string might be wrapped in literal double quotes
      // This happens often in production environments like Koyeb/Docker if misconfigured
      if (jsonToParse.startsWith('"') && jsonToParse.endsWith('"')) {
        try {
          // Attempt to parse once - it might be a double-stringified JSON or just a quoted JSON string
          const parsedOnce = JSON.parse(jsonToParse);
          if (typeof parsedOnce === "string") {
            jsonToParse = parsedOnce.trim();
          } else if (typeof parsedOnce === "object" && parsedOnce !== null) {
            // It was already a valid JSON object starting and ending with quotes (unlikely but possible)
            serviceAccount = parsedOnce;
          }
        } catch (e) {
          // If JSON.parse fails, it might be that the string is "{...}" but wrapped in quotes
          // and contains unescaped characters, so we just strip the outer quotes manually
          jsonToParse = jsonToParse.substring(1, jsonToParse.length - 1).trim();
        }
      }

      if (!serviceAccount) {
        serviceAccount = JSON.parse(jsonToParse);
      }
    } catch (error: any) {
      throw new Error(
        `Failed to parse FCM_SERVICE_ACCOUNT_JSON: ${error.message}`,
      );
    }
  } else if (serviceAccountPath) {
    try {
      // Utiliser import dynamique pour fs en ES modules
      const fs = await import("fs");
      const path = await import("path");

      // Résoudre le chemin relatif depuis le répertoire du serveur
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      const fileContent = fs.readFileSync(resolvedPath, "utf-8");
      serviceAccount = JSON.parse(fileContent);
    } catch (error: any) {
      throw new Error(
        `Failed to load FCM service account from ${serviceAccountPath}: ${error.message}. Make sure the file exists and contains a valid service account JSON with private_key field.`,
      );
    }
  } else {
    throw new Error(
      "FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH must be set. Use the service account JSON file (not google-services.json from mobile app).",
    );
  }

  // Debug: afficher les clés disponibles (sans les valeurs sensibles)
  const availableKeys = Object.keys(serviceAccount || {});
  console.log("Service account keys found:", availableKeys);

  // Valider que les champs requis sont présents
  if (!serviceAccount.private_key) {
    const errorMsg = `Service account JSON is missing private_key field. Available fields: ${availableKeys.join(", ")}`;
    console.error("Service account validation error:", errorMsg);
    console.error("Service account type:", serviceAccount.type);
    console.error("Service account project_id:", serviceAccount.project_id);
    throw new Error(errorMsg);
  }
  if (!serviceAccount.client_email) {
    throw new Error(
      `Service account JSON is missing client_email field. Available fields: ${availableKeys.join(", ")}`,
    );
  }
  if (!serviceAccount.project_id) {
    throw new Error(
      `Service account JSON is missing project_id field. Available fields: ${availableKeys.join(", ")}`,
    );
  }
  if (!serviceAccount.token_uri) {
    // Le token_uri peut être dérivé si absent
    serviceAccount.token_uri =
      serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  }

  return serviceAccount as ServiceAccount;
}

/**
 * Obtient un token d'accès OAuth 2.0 depuis un compte de service JSON
 */
async function getAccessToken(): Promise<string> {
  // Vérifier si le token est encore valide (avec une marge de 5 minutes)
  if (accessToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return accessToken;
  }

  const serviceAccount = await loadServiceAccount();

  // Créer un JWT pour l'authentification
  const jwt = await createJWT(serviceAccount);

  // Échanger le JWT contre un token d'accès
  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get access token: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return accessToken;
}

/**
 * Crée un JWT pour l'authentification OAuth 2.0
 */
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    exp: now + 3600, // Token valide pour 1 heure
    iat: now,
  };

  // Encoder en base64url
  // Buffer est disponible globalement dans Node.js
  const base64UrlEncode = (str: string) => {
    // Utiliser Buffer global ou TextEncoder comme fallback
    const buffer =
      typeof Buffer !== "undefined"
        ? Buffer.from(str)
        : new TextEncoder().encode(str);

    const base64 =
      typeof Buffer !== "undefined"
        ? buffer.toString("base64")
        : btoa(String.fromCharCode(...buffer));

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));

  // Signer avec la clé privée RSA
  const crypto = await import("crypto");

  // S'assurer que la clé privée est bien présente et au bon format
  if (!serviceAccount.private_key) {
    throw new Error("Private key is missing from service account");
  }

  // La clé privée dans le JSON Firebase contient des \n échappés (\\n)
  // qui doivent être convertis en de vrais retours à la ligne
  let privateKey = serviceAccount.private_key.trim();

  // Remplacer tous les \n échappés par de vrais retours à la ligne
  // Gérer à la fois \\n (échappé dans JSON) et \n (déjà converti)
  privateKey = privateKey.replace(/\\n/g, "\n");

  // S'assurer que la clé commence et se termine correctement
  // Les clés Firebase commencent généralement par "-----BEGIN PRIVATE KEY-----"
  if (!privateKey.includes("BEGIN")) {
    throw new Error("Private key format is invalid: missing BEGIN marker");
  }

  if (!privateKey.includes("END")) {
    throw new Error("Private key format is invalid: missing END marker");
  }

  // Vérifier que la clé n'est pas vide après nettoyage
  const keyContent = privateKey
    .replace(/-----BEGIN.*?-----/g, "")
    .replace(/-----END.*?-----/g, "")
    .replace(/\s/g, "");

  if (!keyContent || keyContent.length === 0) {
    throw new Error("Private key appears to be empty after parsing");
  }

  // Créer un objet clé privée depuis la chaîne PEM
  let keyObject;
  try {
    keyObject = crypto.createPrivateKey(privateKey);
  } catch (error: any) {
    throw new Error(
      `Failed to create private key object: ${error.message}. Make sure the private_key in your service account JSON is valid.`,
    );
  }

  // Créer le signer et signer le JWT
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${encodedHeader}.${encodedClaim}`);

  try {
    const signature = sign.sign(keyObject, "base64");

    if (!signature) {
      throw new Error(
        "Failed to generate signature: sign() returned empty result",
      );
    }

    const encodedSignature = signature
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return `${encodedHeader}.${encodedClaim}.${encodedSignature}`;
  } catch (error: any) {
    throw new Error(`Failed to sign JWT: ${error.message}`);
  }
}

/**
 * Obtient un token d'accès valide pour FCM
 */
export async function getFCMAccessToken(): Promise<string> {
  return getAccessToken();
}

/**
 * Récupère le project_id du compte de service
 */
export async function getFCMProjectId(): Promise<string> {
  const serviceAccount = await loadServiceAccount();
  return serviceAccount.project_id;
}
