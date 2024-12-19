const cheerio = require('cheerio');
const { getBrowser, getRandomElement, shuffleArray, delay, isNumeric } = require('./utils');
const db = require('./config.js');
const { timeout } = require('puppeteer');

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
        const mainLinks = [
            'https://anyja.ir/placesByProvince/1',
            'https://anyja.ir/placesByProvince/2',
            'https://anyja.ir/placesByProvince/3',
            'https://anyja.ir/placesByProvince/4',
            'https://anyja.ir/placesByProvince/5',
            'https://anyja.ir/placesByProvince/6',
            'https://anyja.ir/placesByProvince/7',
            'https://anyja.ir/placesByProvince/8',
            'https://anyja.ir/placesByProvince/9',
            'https://anyja.ir/placesByProvince/10',
            'https://anyja.ir/placesByProvince/11',
            'https://anyja.ir/placesByProvince/12',
            'https://anyja.ir/placesByProvince/13',
            'https://anyja.ir/placesByProvince/14',
            'https://anyja.ir/placesByProvince/15',
            'https://anyja.ir/placesByProvince/16',
            'https://anyja.ir/placesByProvince/17',
            'https://anyja.ir/placesByProvince/18',
            'https://anyja.ir/placesByProvince/19',
            'https://anyja.ir/placesByProvince/20',
            'https://anyja.ir/placesByProvince/21',
            'https://anyja.ir/placesByProvince/22',
            'https://anyja.ir/placesByProvince/23',
            'https://anyja.ir/placesByProvince/24',
            'https://anyja.ir/placesByProvince/25',
            'https://anyja.ir/placesByProvince/26',
            'https://anyja.ir/placesByProvince/27',
            'https://anyja.ir/placesByProvince/28',
            'https://anyja.ir/placesByProvince/29',
            'https://anyja.ir/placesByProvince/30',
            'https://anyja.ir/placesByProvince/31',
        ];

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(...mainLinks);
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

            await delay(5000);

            try {
                await page.waitForSelector('.pagination-ul > li > .pagination-link', {
                    timeout: 5000,
                });
                console.log('pagination element find');
            } catch (error) {
                console.log('pagination element not find');
            }

            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls
            const paginationElement = $('.pagination-ul > li > .pagination-link');
            if (paginationElement.length) {
                lsatPageNumber = Math.max(
                    ...$('.pagination-ul > li > .pagination-link')
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
            await delay(5000);

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);

                try {
                    await page.waitForSelector('h6.card-title > a', {
                        timeout: 5000,
                    });
                } catch (error) {
                    //
                }

                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = $('h6.card-title > a')
                    .map((i, e) => $(e).attr('href'))
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
        const INITIAL_PAGE_URL = ['https://anyja.ir'];

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
