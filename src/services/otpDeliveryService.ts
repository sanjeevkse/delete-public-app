import env from "../config/env";
import { ApiError } from "../middlewares/errorHandler";
import logger from "../utils/logger";

type OtpDeliveryPayload = {
  contactNumber: string;
  otp: string;
};

interface OtpDeliveryProvider {
  sendLoginOtp(payload: OtpDeliveryPayload): Promise<void>;
}

const extractProviderError = (responseBody: unknown): string | null => {
  if (!responseBody || typeof responseBody !== "object") return null;
  const body = responseBody as Record<string, unknown>;
  const candidates = [body.message, body.error, body.errors, body.detail, body.details];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = candidate[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
  }
  return null;
};

const isBulk9Success = (responseBody: unknown): boolean => {
  if (!responseBody || typeof responseBody !== "object") {
    return true;
  }

  const body = responseBody as Record<string, unknown>;

  if (typeof body.success === "boolean") {
    return body.success;
  }

  if (typeof body.status === "boolean") {
    return body.status;
  }

  if (typeof body.status === "number") {
    return body.status === 1 || body.status === 200;
  }

  if (typeof body.status === "string") {
    const normalized = body.status.trim().toLowerCase();
    return ["success", "ok", "sent", "1", "200", "true"].includes(normalized);
  }

  return true;
};

class Bulk9OtpProvider implements OtpDeliveryProvider {
  async sendLoginOtp(payload: OtpDeliveryPayload): Promise<void> {
    const { apiKey, senderId, url, route, flash, scheduleTime, smsDetails, message } = env.otp.bulk9;
    if (!apiKey || !senderId) {
      throw new ApiError("OTP provider is not configured", 500);
    }

    const requestBody: Record<string, unknown> = {
      sender_id: senderId,
      message,
      variables_values: payload.otp,
      route,
      numbers: payload.contactNumber
    };
    if (scheduleTime && scheduleTime.trim()) {
      requestBody.schedule_time = scheduleTime.trim();
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    let responseBody: unknown = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      responseBody = responseText;
    }

    if (!response.ok) {
      const providerError = extractProviderError(responseBody);
      logger.error(
        { status: response.status, response: responseBody },
        "Bulk9 OTP send failed with non-success status"
      );
      throw new ApiError(providerError ? `Failed to send OTP: ${providerError}` : "Failed to send OTP", 502);
    }

    if (!isBulk9Success(responseBody)) {
      const providerError = extractProviderError(responseBody);
      logger.error(
        { status: response.status, response: responseBody },
        "Bulk9 OTP send failed with unsuccessful response payload"
      );
      throw new ApiError(providerError ? `Failed to send OTP: ${providerError}` : "Failed to send OTP", 502);
    }
  }
}

class NoopOtpProvider implements OtpDeliveryProvider {
  async sendLoginOtp(payload: OtpDeliveryPayload): Promise<void> {
    logger.warn(
      { contactNumber: payload.contactNumber },
      "OTP provider is noop; OTP is not sent to external gateway"
    );
  }
}

const buildOtpProvider = (): OtpDeliveryProvider => {
  const provider = env.otp.provider.toLowerCase();
  if (provider === "bulk9") {
    return new Bulk9OtpProvider();
  }
  if (provider === "noop") {
    return new NoopOtpProvider();
  }
  throw new ApiError(`Unsupported OTP provider: ${env.otp.provider}`, 500);
};

const otpDeliveryProvider = buildOtpProvider();

export const sendLoginOtp = async (payload: OtpDeliveryPayload): Promise<void> => {
  await otpDeliveryProvider.sendLoginOtp(payload);
};
