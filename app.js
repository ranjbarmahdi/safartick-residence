const {
    getBrowser,
    getRandomElement,
    delay,
    checkMemoryCpu,
    downloadImages,
    convertToEnglishNumber,
    persionMonthToDigit,
    click,
    scrollModal,
    scrollToEnd,
} = require('./utils');
const omitEmpty = require('omit-empty');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./config.js');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const os = require('os');
// const cron = require('node-cron');
// const CronJob = require('cron').CronJob;

// ============================================ existsUrl
async function existsUrl() {
    const existsQuery = `
        SELECT * FROM unvisited u 
        limit 1
    `;
    try {
        const urlRow = await db.oneOrNone(existsQuery);
        if (urlRow) return true;
        return false;
    } catch (error) {
        console.log('we have no url', error);
    }
}

// ============================================ removeUrl
async function removeUrl() {
    const existsQuery = `
        SELECT * FROM unvisited u 
        ORDER BY RANDOM()
        limit 1
    `;
    const deleteQuery = `
          DELETE FROM unvisited 
          WHERE id=$1
     `;
    try {
        const urlRow = await db.oneOrNone(existsQuery);
        // if (urlRow) {
        //     await db.query(deleteQuery, [urlRow.id]);
        // }
        return urlRow;
    } catch (error) {
        console.log('we have no url', error);
    }
}

// ============================================ insertUrlToProblem
async function insertUrlToProblem(url) {
    const existsQuery = `
        SELECT * FROM problem u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO problem ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insertUrlToProblem  function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ insertUrlToVisited
async function insertUrlToVisited(url) {
    const existsQuery = `
        SELECT * FROM visited u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO visited ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insertUrlToVisited function : ${url}\nError:`, error.message);
        }
    }
}

// ============================================ insertResidence
async function insertResidence(queryValues) {
    const query = `
          insert into residence ("sku", "url", "name", "city", "province", "description", "facilities", "capacity", "room_count", "amenities", "rules", "host_name", "contact_number", "average_rating")
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertResidence :', error);
    }
}

// ============================================ insertPrice
async function insertPrice(queryValues) {
    const query = `
          insert into price ("sku" ,"url", "date", "price", "is_instant")
          values ($1, $2, $3, $4, $5)
     `;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertPrice :', error.message);
    }
}

// ============================================ insertComment
async function insertComment(queryValues) {
    const query = `
          insert into comment ("sku" ,"username", "comment_date", "comment_text", "rating")
          values ($1, $2, $3, $4, $5)
     `;

    try {
        const result = await db.oneOrNone(query, queryValues);
        return result;
    } catch (error) {
        console.log('Error in insertComment :', error.message);
    }
}

// ============================================ findMinPrice
async function getPrice(page, xpaths, currency) {
    let price = Infinity;
    let xpath = '';
    try {
        if (xpaths.length == 0) {
            return [price, xpath];
        }

        // Find Price
        for (const _xpath of xpaths) {
            try {
                const priceElements = await page.$x(_xpath);
                if (priceElements.length) {
                    let priceText = await page.evaluate(
                        (elem) => elem.textContent?.replace(/[^\u06F0-\u06F90-9]/g, ''),
                        priceElements[0]
                    );
                    priceText = convertToEnglishNumber(priceText);
                    let priceNumber = currency ? Number(priceText) : Number(priceText) * 10;
                    if (priceNumber < price && priceNumber !== 0) {
                        price = priceNumber;
                        xpath = _xpath;
                    }
                }
            } catch (error) {
                console.log('Error in getPrice Function Foor Loop :', error.message);
            }
        }
    } catch (error) {
        console.log('Error In getPrice :', error);
    } finally {
        return [price, xpath];
    }
}

let start;
// ============================================ scrapResidence
async function scrapResidence(page, residenceURL, imagesDIR) {
    try {
        console.log(`======================== Start scraping : \n${residenceURL}\n`);
        start = new Date();

        // Go To Url
        await page.goto(residenceURL, { timeout: 180000 });

        await delay(5000);

        let html = await page.content();
        let $ = cheerio.load(html);

        const data = {};

        data['sku'] = uuidv4().replace(/-/g, '');

        data['url'] = residenceURL;

        data['name'] = $('h1').text().trim() ? $('h1').text().trim() : null;

        data['city'] =
            $('.city-province').text()?.replace('استان', '')?.trim()?.split('،')[1]?.trim() || null;

        data['province'] =
            $('.city-province').text()?.replace('استان', '')?.trim()?.split('،')[0]?.trim() || null;

        data['description'] =
            $('.accommodation-description-content > div')
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        const facilities = {};
        data['facilities'] =
            $(
                '.accommodation-pdp-specifications__container > .accommodation-pdp-specification > .accommodation-pdp-specification-content'
            )
                .map((i, e) => {
                    const title = $(e)
                        .find('.accommodation-pdp-specification-content__title')
                        .text()
                        ?.trim();
                    const ambients = $(e)
                        .find(
                            '.accommodation-pdp-specification-description > .accommodation-pdp-specification-description__item'
                        )
                        .map((i, e) => $(e).text()?.trim())
                        .get()
                        .join('\n');
                    facilities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        data['capacity'] = facilities['ظرفیت'] || null;

        data['room_count'] = facilities['سرویس‌های خواب'] || null;

        await click(page, '.product-amenities__button');
        await delay(3000);

        html = await page.content();
        $ = cheerio.load(html);

        const amenities = {};
        data['amenities'] =
            $(
                '.product-modal .product-amenities-modal__content > div.product-amenities-modal-section'
            )
                .map((i, e) => {
                    const title = $(e)
                        .find('.product-amenities-modal-section__title')
                        .text()
                        ?.trim();
                    const ambients = $(e)
                        .find('.product-amenity > .product-amenity__main > .product-amenity__text')
                        .map((i, e) => $(e).text()?.trim())
                        .get()
                        .join('\n');
                    amenities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        await click(page, '.product-modal-header__close');
        await delay(1000);

        html = await page.content();
        $ = cheerio.load(html);

        data['rules'] =
            $(
                '.accommodation-additional-rules > .accommodation-additional-rules-list > .accommodation-additional-rules-list__item'
            )
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        data['host_name'] = $('.pdp-host .j-list-text__title').text().trim()
            ? $('.pdp-host .j-list-text__title').text().trim()
            : null;

        data['contact_number'] = $('selector').text().trim() ? $('selector').text().trim() : null;

        // Calendar
        const calendar = [];
        $('.vuec-month').map((i, e) => {
            let [month, year] = $(e)
                .find('.vuec-month-name')
                ?.text()
                ?.trim()
                ?.split(' ')
                ?.map((e) => e?.trim());
            const monthDigit = persionMonthToDigit(month);
            const yearDigit = convertToEnglishNumber(year);
            const reservable = $(e)
                .find('.vuec-month-content .vuec-day.selectable .calendar-range-day__holder')
                .map((i, e) => {
                    const day = convertToEnglishNumber(
                        $(e).find('.calendar-range-day__date').text()?.trim()
                    );
                    let price = convertToEnglishNumber(
                        $(e)
                            .find('.calendar-range-day__price')
                            .text()
                            ?.replace(/[^\u06F0-\u06F90-9]/g, '')
                            ?.trim()
                    );
                    if (price) {
                        price *= 1000;
                    }
                    const date = `${yearDigit}\/${monthDigit}\/${day}`;
                    const available = true;
                    let is_instant = false;
                    if ($(e).hasClass('agenda')) {
                        is_instant = true;
                    }
                    calendar.push({ date, price, available, is_instant });
                });
        });

        data['calendar'] = calendar;

        // Average Rating
        const average_rating = {};

        $('.accommodation-detailed-rate__item > div > div').map((i, e) => {
            const title = $(e)
                .find('> .accommodation-badge-rate-info > .accommodation-badge-rate-info__title')
                .text()
                ?.trim();
            const value = $(e)
                .find('> .accommodation-badge-rate__score')
                .text()
                ?.replace('/5', '')
                ?.trim();
            average_rating[title] = value;
            return `${title}:${value}`;
        });

        const totalRate =
            $('h2.accommodation-overall-rate__title')
                .text()
                ?.replace('امتیاز', '')
                ?.replace('کلی', '')
                ?.replace('اقامتگاه', '')
                ?.replace('از', '')
                ?.replace('۵', '')
                ?.trim() || null;

        if (totalRate) {
            average_rating['امتیاز کلی'] = totalRate;
        }

        data['average_rating'] =
            Object.keys(average_rating)
                .map((key) => `${key}:${average_rating[key]}`)
                .join('\n') || null;

        // Comments
        const comments = [];
        $('.accommodation-abstract-comments > li > .comment-card').map((i, e) => {
            const username = $(e)
                .find('.comment-card-guest-info > div > .comment-card-guest-info__title')
                .text()
                ?.trim();
            let rating =
                5 -
                    Number(
                        $(e).find(
                            '.comment-card-info > .accommodation-rate-star-chart > svg[fill="#E6E6E6"]'
                        ).length
                    ) || null;

            let comment_date = null;
            const comment_text = $(e)
                .find('.comment-card__content > .comment-card__text')
                .filter((i, e) => $(e).text()?.trim())
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n');
            comments.push({ username, rating, comment_date, comment_text });
        });

        data['comments'] = comments;

        // Download Images
        const image_xpaths = [
            '/html/body/div[1]/div/div/main/div/div[1]/article/header/div[2]/div//img[@class="gallery-img__image"]',
        ];

        let imageUrls = await Promise.all(
            image_xpaths.map(async (_xpath) => {
                try {
                    await page.waitForXPath(_xpath, { timeout: 5000 });
                } catch (error) {}

                const imageElements = await page.$x(_xpath);

                // Get the src attribute of each image element found by the XPath
                const srcUrls = await Promise.all(
                    imageElements.map(async (element) => {
                        let src = await page.evaluate(
                            (el) => el.getAttribute('src')?.replace(/(-[0-9]+x[0-9]+)/g, ''),
                            element
                        );
                        return src;
                    })
                );

                return srcUrls;
            })
        );

        imageUrls = imageUrls.flat();
        imageUrls = [...new Set(imageUrls)];

        console.log('Download Images');
        await downloadImages(imageUrls, imagesDIR, data.sku);

        return data;
    } catch (error) {
        console.log('Error In scrapResidence in page.goto', error);
        await insertUrlToProblem(residenceURL);
        return null;
    }
}

// ============================================ Main
async function main() {
    let urlRow;
    let browser;
    let page;
    try {
        const DATA_DIR = path.normalize(__dirname + `/${process.env.DIRECTORY_NAME}`);
        const IMAGES_DIR = path.normalize(DATA_DIR + '/images');

        // Create SteelAlborz Directory If Not Exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        if (!fs.existsSync(IMAGES_DIR)) {
            fs.mkdirSync(IMAGES_DIR);
        }

        // get product page url from db
        urlRow = await removeUrl();

        if (urlRow?.url) {
            // get random proxy
            const proxyList = [''];
            const randomProxy = getRandomElement(proxyList);

            // Lunch Browser
            await delay(Math.random() * 4000);
            browser = await getBrowser(randomProxy, true, false);
            page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080,
            });

            const residenceInfo = await scrapResidence(page, urlRow.url, IMAGES_DIR);
            const insertQueryInput = [
                residenceInfo.sku,
                residenceInfo.url,
                residenceInfo.name,
                residenceInfo.city,
                residenceInfo.province,
                residenceInfo.description,
                residenceInfo.facilities,
                residenceInfo.capacity,
                residenceInfo.room_count,
                residenceInfo.amenities,
                residenceInfo.rules,
                residenceInfo.host_name,
                residenceInfo.contact_number,
            ];

            // if exists ResidenceInfo insert it to Residences
            if (residenceInfo) {
                await insertResidence(insertQueryInput);
                await insertUrlToVisited(urlRow?.url);

                const calendar = residenceInfo.calendar;
                const calendarPromises = calendar.map(({ date, price, is_instant }) =>
                    insertPrice([residenceInfo.sku, residenceInfo.url, date, price, is_instant])
                );

                console.log('Insert Calendar');
                await Promise.all(calendarPromises);

                const comments = residenceInfo.comments;
                const commentsPromises = comments.map(
                    ({ username, rating, comment_date, comment_text }) =>
                        insertComment([
                            residenceInfo.sku,
                            username,
                            comment_date,
                            comment_text,
                            rating,
                        ])
                );

                console.log('Insert Comments');
                await Promise.all(commentsPromises);
            }
        }
    } catch (error) {
        console.log('Error In main Function', error);
        await insertUrlToProblem(urlRow?.url);
    } finally {
        // Close page and browser
        console.timeEnd('Execution Time');
        console.log('End');
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

// ============================================ run_1
async function run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    if (checkMemoryCpu(memoryUsagePercentage, cpuUsagePercentage, usageMemory)) {
        await main();
    } else {
        const status = `status:
          memory usage = ${usageMemory}
          percentage of memory usage = ${memoryUsagePercentage}
          percentage of cpu usage = ${cpuUsagePercentage}\n`;

        console.log('main function does not run.\n');
        console.log(status);
    }
}

// ============================================ run_2
async function run_2(memoryUsagePercentage, cpuUsagePercentage, usageMemory) {
    let urlExists;

    do {
        urlExists = await existsUrl();
        if (urlExists) {
            await run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory);
        }
    } while (urlExists);
}

// ============================================ Job

// stopTime = 8000
// let job = new CronJob('*/3 * * * * *', async () => {

//      console.log("cron");
//      let usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
//      let memoryUsagePercentage = checkMemoryUsage();
//      let cpuUsagePercentage = await getCpuUsagePercentage();

//      if (usageMemory >= 13 || cpuUsagePercentage >= 90) {
//           console.log("=========================================");
//           console.log(`job stopped for ${stopTime} ms`);
//           job.stop();

//           setInterval(() => {
//                console.log(`Restarting cron job after ${stopTime} ms...`)
//                job.start();
//           }, stopTime)
//      }

//      if (memoryUsagePercentage <= 80 && cpuUsagePercentage <= 85) {
//           main();
//           console.log("main");
//      }

// })

// job.start()

// run_1(80, 80, 20);
run_2(80, 80, 20);
