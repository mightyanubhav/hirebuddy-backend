const Mailjet = require("node-mailjet");

const mailjet = Mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

async function sendOTPEmail(toEmail, otp) {
  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "kumaranubhav691@gmail.com", // must be verified in Mailjet
          Name: "HireBuddy OTP",
        },
        To: [
          {
            Email: toEmail,
          },
        ],
        Subject: "Your OTP Code",
        TextPart: `Your OTP code for the following action is  ${otp}. It expires in 10 minutes.`,
        HTMLPart: `
          <h2>OTP Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color:#007bff">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
        `,
      },
    ],
  });

  try {
    const result = await request;
    console.log("Email sent successfully:", result.body);
    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
}

module.exports = sendOTPEmail;
