import { SelectJob } from "@repo/db/schema";
import { filterAndFormatNaukriJobs } from "@/src/utils/utils";
import { sendJobsToQueue } from "../queue/producer";
import { getBrowser } from "./browser";

export const dynamic = "force-dynamic";

// Function to scrape jobs from Naukri
export const naukriJobScraper = async (): Promise<void> => {
  console.log(`
    ############################################
    # 🚀 Starting Naukri Scraper...
    ############################################
  `);

  // Base URL for Naukri IT jobs
  // const BASE_URL = "https://www.naukri.com/it-jobs";
  const BASE_URL =
    "https://www.naukri.com/jobs-in-india-5?functionAreaIdGid=8&jobAge=1";

  // Launch Puppeteer browser
  const browser = await getBrowser();

  // Open a new page
  const page = await browser.newPage();

  // Set user agent to mimic a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
  );

  // Go to the Naukri IT jobs page
  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Auto-scroll function to scroll down the page
  const autoScroll = async (): Promise<void> => {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeightBefore = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeightBefore) {
            clearInterval(timer);
            resolve();
          }
        }, 500);
      });
    });
  };

  // Function to extract job details from the page
  const extractJobs = async (): Promise<SelectJob[]> => {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".cust-job-tuple")).map(
        (el) => {
          const titleEl = el.querySelector("h2 a.title");
          const companyEl = el.querySelector(".comp-name");
          const locationEl = el.querySelector(".loc .locWdth");
          const experienceEl = el.querySelector(".expwdth");
          const salaryEl = el.querySelector(".sal-wrap span[title]");
          const logoEl = el.querySelector(".logoImage");
          const postedEl = el.querySelector(".job-post-day");
          const descEl = el.querySelector(".job-desc");
          const tagsEls = el.querySelectorAll(".tags-gt li");

          return {
            title: titleEl?.textContent?.trim() || "",
            company: companyEl?.textContent?.trim() || "",
            location: locationEl?.textContent?.trim() || "",
            experience: experienceEl?.textContent?.trim() || "",
            salary: salaryEl?.textContent?.trim() || "Not disclosed",
            logo: logoEl?.getAttribute("src") || "",
            jobType: "",
            jobLink: titleEl?.getAttribute("href") || "",
            postedAt: postedEl?.textContent?.trim() || "",
            description: descEl?.textContent?.trim() || "",
            skills: Array.from(tagsEls).map(
              (tag) => tag.textContent?.trim() || ""
            ),
          };
        }
      ) as SelectJob[];
    });
  };

  // Function to get job details from the job link
  const getJobDetails = async (jobUrl: string): Promise<Partial<SelectJob>> => {
    // Open a new page for job details
    const jobPage = await browser.newPage();

    // Navigate to the job URL
    await jobPage.goto(jobUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for the job details to load
    const details = await jobPage.evaluate(() => {
      const descEl = document.querySelector(
        ".styles_JDC__dang-inner-html__h0K4t"
      );
      const skillEls = Array.from(
        document.querySelectorAll(".styles_key-skill__GIPn_ a span")
      );

      return {
        description: descEl?.textContent?.trim() || "",
        skills: skillEls.map((s) => s.textContent?.trim() || ""),
      };
    });

    // Close the job details page
    await jobPage.close();

    // Return the job details
    return details;
  };

  // Seen set to track unique job links
  const seen = new Set<string>();

  // Loop over 5 pages (or fewer if "Next" button disappears)
  for (let currentPage = 1; currentPage <= 5; currentPage++) {
    // Auto-scroll to load more jobs
    await autoScroll();

    // Extract jobs from the current page
    let jobsOnPage = await extractJobs();

    // Fetch additional details for each job
    for (let i = 0; i < jobsOnPage.length; i++) {
      const job = jobsOnPage[i];
      if (job?.jobLink) {
        console.log(`Fetching details for: ${job.title}`);
        const extraDetails = await getJobDetails(job.jobLink);
        jobsOnPage[i] = { ...job, ...extraDetails };
      }
    }

    console.log(`Scraped Page ${currentPage}, Jobs: ${jobsOnPage.length}`);

    // Filter and format the jobs
    const filteredJobs = filterAndFormatNaukriJobs(jobsOnPage, seen);

    // Send the filtered jobs to the queue
    await sendJobsToQueue(filteredJobs);

    // Navigate to the next page
    const nextButton = await page.$("#lastCompMark > a:nth-child(4)");

    // Check if the "Next" button is available and click it
    if (nextButton) {
      await nextButton.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      console.log("No more pages found.");
      break;
    }
  }

  // Close the browser
  await browser.close();
  console.log(`
    ############################################
    # ✅ Naukri Scraping Complete!
    # 📄 Jobs scraped and queued.
    ############################################
  `);
};
