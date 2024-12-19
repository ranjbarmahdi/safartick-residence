const cheerio = require('cheerio');
const { getBrowser, getRandomElement, shuffleArray, delay, isNumeric } = require('./utils');
const db = require('./config.js');

// ============================================ insertUrl
async function insertUrl(url) {
    const existsQuery = `
        SELECT * FROM unvisited u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO unvisited ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insert url function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ findAllMainLinks
async function findAllMainLinks(page, initialUrl) {
    const allMainLinks = [];
    try {
        const url = initialUrl;
        await page.goto(url, { timeout: 360000 });

        // sleep 5 second
        console.log('-------sleep 5 second');
        await delay(5000);

        // load cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        // Getting All Main Urls In This Page
        const mainLinks = [];

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(initialUrl);
    } catch (error) {
        console.log('Error In findAllMainLinks function', error.message);
    }

    return Array.from(new Set(allMainLinks));
}

// ============================================ findAllPagesLinks
async function findAllPagesLinks(page, mainLinks) {
    let allPagesLinks = [];

    // find pagination and pages
    for (let i = 0; i < mainLinks.length; i++) {
        try {
            const url = mainLinks[i];
            console.log('============================================================');
            console.log('start findind pages for main link :', url);
            await page.goto(url, { timeout: 360000 });

            try {
                await page.waitForSelector('.pagination_pagination-container__XURAR > li', {
                    timeout: 10000,
                });
            } catch (error) {
                console.log('not found pagination');
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls
            const paginationElement = $('.pagination_pagination-container__XURAR > li');
            if (paginationElement.length) {
                let lsatPageNumber = Math.max(
                    ...$('.pagination_pagination-container__XURAR > li')
                        .filter((i, e) => isNumeric($(e).text().trim()))
                        .map((i, e) => Number($(e).text().trim()))
                        .get()
                );
                console.log('lsatPageNumber :', lsatPageNumber);
                for (let j = 1; j <= lsatPageNumber; j++) {
                    const newUrl = url + `?page=${j}`;
                    allPagesLinks.push(newUrl);
                }
            } else {
                allPagesLinks.push(url);
            }
        } catch (error) {
            console.log('Error in findAllPagesLinks', error);
        }
    }

    allPagesLinks = shuffleArray(allPagesLinks);
    return Array.from(new Set(allPagesLinks));
}
// ============================================ findAllProductsLinks
async function findAllProductsLinks(page, allPagesLinks) {
    for (let i = 0; i < allPagesLinks.length; i++) {
        try {
            const url = allPagesLinks[i];
            console.log(
                '============================================================ loop:',
                i + 1
            );
            console.log('Start Finding products urls from page :', url);
            await page.goto(url, { timeout: 360000 });

            // sleep 5 second when switching between pages
            console.log('-------sleep 5 second');

            try {
                await page.waitForSelector('a[target="_blank"]', { timeout: 20000 });
                console.log('Selector found!');
            } catch (error) {
                console.error('Selector not found or an error occurred');
            }

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);
                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = $('a[target="_blank"]')
                    .map((i, e) => 'https://lidomatrip.com' + $(e).attr('href'))
                    .get();

                // insert prooduct links to unvisited
                for (let j = 0; j < productsUrls.length; j++) {
                    try {
                        const url = productsUrls[j];
                        await insertUrl(url);
                        await delay(250);
                    } catch (error) {
                        console.log('Error in findAllProductsLinks for loop:', error.message);
                    }
                }

                nextPageBtn = await page.$$('notFound');
                if (nextPageBtn.length) {
                    let btn = nextPageBtn[0];
                    await btn.click();
                }
                await delay(5000);
            } while (nextPageBtn.length);
        } catch (error) {
            console.log('Error In findAllProductsLinks function', error);
        }
    }
}

// ============================================ Main
async function main() {
    try {
        const INITIAL_PAGE_URL = ['https://lidomatrip.com/search'];

        // get random proxy
        const proxyList = [''];
        const randomProxy = getRandomElement(proxyList);

        // Lunch Browser
        const browser = await getBrowser(randomProxy, true, false);
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        for (const u of INITIAL_PAGE_URL) {
            const mainLinks = await findAllMainLinks(page, u);
            const AllPagesLinks = await findAllPagesLinks(page, mainLinks);
            await findAllProductsLinks(page, AllPagesLinks);
        }

        // Close page and browser
        console.log('End');
        await page.close();
        await browser.close();
    } catch (error) {
        console.log('Error In main Function', error);
    }
}

main();
