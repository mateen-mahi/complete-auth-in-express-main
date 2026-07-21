import puppeteer from "puppeteer";

export async function generateCertificatePdf(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"], 
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "1123px",
      height: "794px",
      printBackground: true,
      landscape: true,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}