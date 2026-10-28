-- Phone + OTP is gone. It could never send a code without an SMS gateway, so
-- outside demo mode — which printed the code on screen — it was unusable.
-- Marketplace accounts arrive through a social provider; staff sign in with a
-- username and password.
DROP TABLE "OtpCode";
