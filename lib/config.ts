export const publicConfig = {
  studentName: process.env.NEXT_PUBLIC_STUDENT_NAME || "[MY FULL NAME]",
  githubUrl: process.env.NEXT_PUBLIC_GITHUB_URL || "#configure-github",
  telegramUrl:
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "#configure-telegram",
  sheetUrl:
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "#configure-google-sheet",
};
