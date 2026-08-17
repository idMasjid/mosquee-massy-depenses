import "server-only";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export async function isLocalAuthEnabled(): Promise<boolean> {
  // Filet de sécurité : force la connexion locale même si le paramètre en
  // base la désactive, pour se sortir d'un verrouillage total (ex: Google
  // cassé) sans devoir toucher la base de données à la main.
  if (process.env.FORCE_LOCAL_AUTH === "true") return true;
  const settings = await getAppSettings();
  return settings.localAuthEnabled;
}

export async function setLocalAuthEnabled(enabled: boolean) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { localAuthEnabled: enabled },
    create: { id: SETTINGS_ID, localAuthEnabled: enabled },
  });
}
