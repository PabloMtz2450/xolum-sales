export const XOLUM_VALUES = [
  "Soluciones que realmente ayudan.",
  "Diseñamos alrededor de problemas reales.",
  "Automatizamos lo repetitivo.",
  "Conectamos lo que está separado.",
  "Simplificamos lo complicado.",
  "Si no simplifica, no sirve.",
] as const;

export function availableToPromise(onHand: number, reserved: number) {
  return Math.max(0, onHand - reserved);
}

export function canExposeLogistics(tmsEnabled: boolean) {
  return tmsEnabled;
}

export function canMarkDelivered(input: {
  tmsEnabled: boolean;
  eventReceived: boolean;
  podValidated: boolean;
  authorizedException: boolean;
}) {
  if (!input.tmsEnabled || !input.eventReceived) return false;
  return input.podValidated || input.authorizedException;
}
