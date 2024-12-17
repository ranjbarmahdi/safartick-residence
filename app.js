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
        if (urlRow) {
            await db.query(deleteQuery, [urlRow.id]);
        }
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

// ============================================ scrapResidence
async function scrapResidence(page, residenceURL, imagesDIR) {
    try {
        console.log(`======================== Start scraping : \n${residenceURL}\n`);
        start = new Date();

        // Go To Url
        await page.goto(residenceURL, { timeout: 180000 });

        await delay(5000);

        // Remove all <iframe> tags except the ones with class ".goftino_w"
        await page.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
                if (!iframe.classList.contains('goftino_w')) {
                    iframe.remove(); // Remove iframe
                }
            });
        });

        await scrollToEnd(page);

        try {
            await page.waitForSelector('#images > .rtl-mui-ecpffk img', { timeout: 5000 });
        } catch (error) {
            console.log('Images Selector Not Found.');
        }

        let html = await page.content();
        let $ = cheerio.load(html);

        let imageUrls = $('#images > .rtl-mui-ecpffk img')
            .map((i, e) => $(e).attr('src')?.trim())
            .get();

        console.log({ imageUrls });

        const data = {};

        data['sku'] = uuidv4().replace(/-/g, '');

        data['url'] = residenceURL;

        data['name'] = $('h1').text().trim() || null;

        data['city'] =
            $('.TitleReviewsAndLocation_location__hbuUd .Typography_bodyM__0rg69 ')
                .text()
                .split('،')[0]
                ?.trim() || null;

        data['province'] = null;

        await click(page, '.HouseAbout_house-about___KcbT .ShowMorePopUp_more__6nw5K > button');
        await delay(3000);

        html = await page.content();
        $ = cheerio.load(html);

        data['description'] =
            $('.ShowMorePopUp_content__MMrv9 > p')
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        await click(page, '.ShowMorePopUp_header__ADzA1 > button');
        await delay(1000);

        html = await page.content();
        $ = cheerio.load(html);

        const facilities = {};
        data['facilities'] =
            $('.HouseInformation_content__JvDHv > div > div')
                .map((i, e) => {
                    const title = $(e).find('span:first').text()?.trim();
                    const ambients = $(e)
                        .find('span:last')
                        .map((i, e) => $(e).text()?.trim())
                        .get()
                        .join('\n');
                    facilities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        data['capacity'] =
            $('.HouseInformation_capacity-content__jco7i > span:last').text().trim() || null;

        data['room_count'] =
            $('.HouseInformation_beds-content__T40r1 > span:last').text().trim() || null;

        await click(
            page,
            '.HouseFeatures_house-features__f0cw5 .ShowMorePopUp_more__6nw5K > button'
        );
        await delay(3000);

        html = await page.content();
        $ = cheerio.load(html);

        const amenities = {};
        data['amenities'] =
            $('.ShowMorePopUp_content__MMrv9 > div > div:not(.HouseFeatures_empty-texts__I9BO1)')
                .map((i, e) => {
                    const title = $(e).find('> h3').text()?.trim();
                    const ambients = $(e)
                        .find('>div .Typography_bodyL__kyuAJ')
                        .map((i, e) => $(e).text()?.trim())
                        .get()
                        .join('\n');
                    amenities[title] = ambients;
                    return `${title}:\n${ambients}`;
                })
                .get()
                .join('\n\n') || null;

        await click(page, '.ShowMorePopUp_header__ADzA1 > button');
        await delay(1000);

        html = await page.content();
        $ = cheerio.load(html);

        data['rules'] =
            $('.Rules_left-rules-container__0HcFa')
                .find(
                    '.RulesItem_header-rules-item__ga8_x > span, .RulesDescription_description-rules-item__96I_s > span'
                )
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n') || null;

        data['host_name'] =
            $(
                '.HostProfile_host-profile-content__AHipT > .HostProfile_host-profile__w2KCy > .HostProfile_host-name__6G_Jl'
            )
                .text()
                .replace('میزبان', '')
                ?.trim() || null;

        data['contact_number'] = $('selector').text().trim() ? $('selector').text().trim() : null;

        // Calendar
        try {
            await page.waitForSelector(
                '.calendar-wrapper > .calendar-days-container > .days-container',
                { timeout: 5000 }
            );
        } catch (error) {
            //
        }

        html = await page.content();
        $ = cheerio.load(html);

        const calendar = [];
        $('.calendar-wrapper > .calendar-days-container > .days-container').map((i, e) => {
            const yearAndMonthElements = $('.rtl-mui-1t6c6c4 > div')[i];
            let month = $(yearAndMonthElements).find('.date-months-names').text().split(' ')[0];
            let year = $(yearAndMonthElements).find('.date-months-names').text().split(' ')[1];
            const monthDigit = persionMonthToDigit(month);
            const yearDigit = convertToEnglishNumber(year);
            const reservable = $(e)
                .find('.day-tag:not(.empty-day-tag, .day-is-disabled, .day-is-reserved)')
                .map((i, e) => {
                    const day = convertToEnglishNumber(
                        $(e).find('> .day-label > .day-label-dates .rtl-mui-1v8bccv').text()?.trim()
                    );
                    let price = convertToEnglishNumber(
                        $(e)
                            .find('> .day-label > .day-label-dates > .price:first')
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
                    if (
                        $(e).find('> .day-label > .day-label-dates .date-picker-instant-icon')
                            .length
                    ) {
                        is_instant = true;
                    }
                    calendar.push({ date, price, available, is_instant });
                });
        });

        data['calendar'] = calendar;

        // Comments
        const average_rating = {};

        $('.ReviewsContainer_reviews-rate-items__Fqvua > .rtl-mui-1tiyaz6').map((i, e) => {
            const title = $(e).find('> .rtl-mui-3yuszo').text()?.trim();
            const value = $(e).find('> .rtl-mui-yfj0b0').text().replace('از5', '')?.trim();
            average_rating[title] = value;
            return `${title}:${value}`;
        });

        if (average_rating.hasOwnProperty('امتیاز اقامتگاه')) {
            average_rating['امتیاز کلی'] = average_rating['امتیاز اقامتگاه'];
            delete average_rating['امتیاز اقامتگاه'];
        }

        data['average_rating'] =
            Object.keys(average_rating)
                .map((key) => `${key}:${average_rating[key]}`)
                .join('\n') || null;

        await click(page, '.ReviewsContainer_show-all-reviews__LJ4dt > button');
        await delay(3000);

        await scrollModal(
            page,
            '.Modal_modal-content__8hZOw > .ReviewsModal_reviews-modal___EoTg > .ReviewsModal_review-modal-main-container__dyu4D > .ReviewsModal_reviews-items-container__tvl87 > .infinite-scroll-component__outerdiv > .ReviewsModal_reviews-list-wrapper__gG3yf',
            100,
            100
        );

        html = await page.content();
        $ = cheerio.load(html);

        const comments = [];
        $('.infinite-scroll-component__outerdiv .rtl-mui-1rjsml5').map((i, e) => {
            const username =
                $(e)
                    .find('>.user-information-wrapper > .user-review-info > .suggestion > span')
                    .text()
                    ?.trim() || null;

            let rating =
                $(e).find(
                    '>.user-information-wrapper > .user-review-info > .review-details-wrapper > .rate-box > .icon-star-Filled'
                ).length +
                    $(e).find(
                        '>.user-information-wrapper > .user-review-info > .review-details-wrapper > .rate-box > .icon-star-half-Filled'
                    ).length /
                        2 || null;

            let comment_date = $(e).find('NotFound').text()?.trim() || null;

            const comment_text = $(e)
                .find('.positive-negative-container > div > .rtl-mui-3yuszo , .rtl-mui-1yfqltl')
                .filter((i, e) => $(e).text()?.trim())
                .map((i, e) => $(e).text()?.trim())
                .get()
                .join('\n');
            comments.push({ username, rating, comment_date, comment_text });
        });

        data['comments'] = comments;

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
    console.time();
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

            // Create a new browser context with no notifications
            const context = await browser.createIncognitoBrowserContext();

            // Create a new page in the incognito context
            page = await context.newPage();

            // Block notifications by overriding the permissions
            await page.evaluateOnNewDocument(() => {
                // Block notification permission requests
                const originalPrompt = window.Notification.requestPermission;
                window.Notification.requestPermission = () => Promise.resolve('denied');
            });

            await page.setViewport({
                width: 1440,
                height: 810,
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
                residenceInfo.average_rating,
            ];

            // if exists ResidenceInfo insert it to Residences
            if (residenceInfo) {
                await insertResidence(insertQueryInput);
                await insertUrlToVisited(urlRow?.url);

                console.log('Insert Prices');
                const calendar = residenceInfo.calendar;
                const calendarPromises = calendar.map(({ date, price, is_instant }) =>
                    insertPrice([residenceInfo.sku, residenceInfo.url, date, price, is_instant])
                );

                await Promise.all(calendarPromises);

                console.log('Insert Comments');
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

                await Promise.all(commentsPromises);
            }
        }
    } catch (error) {
        console.log('Error In main Function', error);
        await insertUrlToProblem(urlRow?.url);
    } finally {
        // Close page and browser
        console.timeEnd();
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
