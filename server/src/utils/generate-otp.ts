import { randomInt } from "node:crypto";

export const generateOTP = (digits: number = 6) => {
  const max = 10 ** digits;
  const otpNumber = randomInt(0, max);
  return otpNumber.toString().padStart(digits, "0");
};
