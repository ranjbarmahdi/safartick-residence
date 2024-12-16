// const { createObjectCsvWriter } = require('csv-writer');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
// const csv = require('csv-parser');
// const reader = require('xlsx');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ==================================== isNumeric
const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string);

// ==================================== click
function persionMonthToDigit(month) {
    const months = [
        'فروردین',
        'ازدیبهشت',
        'خرداد',
        'تیر',
        'مرداد',
        'شهریور',
        'مهر',
        'آبان',
        'آذر',
        'دی',
        'بهمن',
        'اسفند',
    ];
    return months.indexOf(month) + 1;
}

// ==================================== click
async function click(page, selector) {
    try {
        let elements = await page.$$(selector);
        if (elements?.length) {
            let element = elements[0];
            await element.click();
        }
    } catch (error) {
        console.log('Error in click function :', error);
    }
}

// ==================================== writeExcel
function writeExcel(jsonFile, excelDir) {
    let workBook = reader.utils.book_new();
    const workSheet = reader.utils.json_to_sheet(jsonFile);
    reader.utils.book_append_sheet(workBook, workSheet, `response`);
    reader.writeFile(workBook, excelDir);
}

// ==================================== readCsv
async function readCsv(csvFilePath) {
    return new Promise((res, rej) => {
        const result = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => result.push(data))
            .on('end', () => {
                console.log(`CSV file ${path.basename(csvFilePath)} read successfully`);
                res(result);
            })
            .on('error', (err) => {
                console.log('Eror in readCsv function :', err);
                rej(err);
            });
    });
}

// ==================================== writeCsv
async function writeCsv(data, csvFilePath) {
    return new Promise((res, rej) => {
        try {
            const keys = Object.keys(data[0]);
            const csvWriter = createObjectCsvWriter({
                path: csvFilePath,
                header: keys.map((key) => ({ id: key, title: key })),
            });
            csvWriter
                .writeRecords(data)
                .then(() => {
                    console.log(`CSV file written successfully`);
                    res();
                })
                .catch((error) => {
                    console.error(`Error writing CSV `, error);
                    rej(error);
                });
        } catch (error) {
            rej(error);
        }
    });
}

//============================================ scrollToEnd
async function scrollToEnd(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 3;
            const maxScrolls = 9999999; // You can adjust the number of scrolls

            const scrollInterval = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                // Stop scrolling after reaching the bottom or a certain limit
                if (totalHeight >= scrollHeight || totalHeight >= distance * maxScrolls) {
                    clearInterval(scrollInterval);
                    resolve();
                }
            }, 20); // You can adjust the scroll interval
        });
    });
}

//============================================ scrollModal
const scrollModals = async (page, modalSelector, scrollAmount = 1, waitTime = 20) => {
    const modals = await page.$$(modalSelector); // Use $$ to get all matching elements
    if (modals.length === 0) {
        console.error(`No modals found with selector "${modalSelector}"`);
        return;
    }

    for (const modal of modals) {
        await page.evaluate(
            async (modalElement, scrollAmount, waitTime) => {
                await new Promise((resolve) => {
                    let totalScrolled = 0;
                    const scrollInterval = setInterval(() => {
                        const { scrollTop, scrollHeight, clientHeight } = modalElement;

                        // Scroll the modal by the specified amount
                        modalElement.scrollBy(0, scrollAmount);
                        totalScrolled += scrollAmount;

                        // Stop scrolling if the bottom of the modal is reached
                        if (scrollTop + clientHeight >= scrollHeight) {
                            clearInterval(scrollInterval);
                            resolve();
                        }
                    }, waitTime); // Wait between scrolls
                });
            },
            modal,
            scrollAmount,
            waitTime
        );
    }

    console.log('Scrolling completed modal.');
};

//============================================ choose a random element from an array
const getRandomElement = (array) => {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
};

//============================================ Download Images
async function downloadImages(imagesUrls, imagesDIR, uuid) {
    for (let i = 0; i < imagesUrls.length; i++) {
        try {
            const imageUrl = imagesUrls[i];
            const response = await fetch(imageUrl);

            if (response.status === 200) {
                const buffer = await response.buffer();

                // Determine image type based on URL
                let imageType = '.jpg'; // default
                const imageExtensionMatch = imageUrl.match(
                    /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg|ico)$/i
                );
                if (imageExtensionMatch) {
                    imageType = imageExtensionMatch[0];
                }

                // Generate uuidv4
                const localFileName = `${uuid}-${i + 1}${imageType}`;
                const imageDir = path.normalize(path.join(imagesDIR, localFileName));
                fs.writeFileSync(imageDir, buffer);
            }
        } catch (error) {
            console.log('Error In Download Images', error);
        }
    }
}

//============================================ Login
async function login(page, url, userOrPhone, pass) {
    try {
        await page.goto(url, { timeout: 360000 });

        let u = '09376993135';
        let p = 'hd6730mrm';
        // sleep 5 second
        console.log('-------sleep 5 second');
        await delay(5000);

        // load cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        const usernameInputElem = await page.$$('input#username');
        await page.evaluate((e) => (e.value = '09376993135'), usernameInputElem[0]);
        await delay(3000);

        const continueElem = await page.$$('.register_page__inner > button[type=submit]');
        await continueElem[0].click();
        await delay(3000);

        const passwordInputElem = await page.$$('input#myPassword');
        await passwordInputElem[0].type('hd6730mrm');
        // await page.evaluate((e) => e.value = "hd6730mrm" ,passwordInputElem[0]);
        await delay(3000);

        const enterElem = await page.$$('.register_page__inner > button[type=submit]');
        await enterElem[0].click();
        await delay(3000);
    } catch (error) {
        console.log('Error In login function', error);
    }
}

//============================================ convert To English Number
function convertToEnglishNumber(inputNumber) {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    // Check if the input contains Persian numbers
    const containsPersianNumber = new RegExp(`[${persianNumbers.join('')}]`).test(inputNumber);

    if (containsPersianNumber) {
        // Convert Persian numbers to English numbers
        for (let i = 0; i < 10; i++) {
            const persianDigit = new RegExp(persianNumbers[i], 'g');
            inputNumber = inputNumber.replace(persianDigit, i.toString());
        }
        return inputNumber;
    } else {
        // Input is already an English number, return as is
        return inputNumber;
    }
}

// ============================================ getBrowser
const getBrowser = async (proxyServer, headless = true, withProxy = true) => {
    try {
        const args = (withProxy) => {
            if (withProxy == true) {
                console.log('terue');
                return [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    `--proxy-server=${proxyServer}`,
                ];
            } else {
                return ['--no-sandbox', '--disable-setuid-sandbox'];
            }
        };
        // Lunch Browser
        const browser = await puppeteer.launch({
            headless: headless, // Set to true for headless mode, false for non-headless
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
            args: args(withProxy),
            protocolTimeout: 6000000,
        });

        return browser;
    } catch (error) {
        console.log('Error in getBrowserWithProxy function', error);
    }
};

// ============================================ delay
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ============================================ shuffleArray
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================ checkMemoryUsage
function checkMemoryUsage() {
    const totalMemory = os.totalmem();
    const usedMemory = os.totalmem() - os.freemem();
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    return memoryUsagePercent;
}

// ============================================ getCpuUsagePercentage
function getCpuUsagePercentage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    return (1 - totalIdle / totalTick) * 100;
}

// ============================================ checkMemoryCpu
async function checkMemoryCpu(memoryUsagePercent, cpuUsagePercent, memoryUsageGig) {
    const usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
    const memoryUsagePercentage = checkMemoryUsage();
    const cpuUsagePercentage = getCpuUsagePercentage();

    const cond_1 = memoryUsagePercentage <= memoryUsagePercent;
    const cond_2 = cpuUsagePercentage <= cpuUsagePercent;
    const cond_3 = usageMemory <= memoryUsageGig;
    return cond_1 && cond_2 && cond_3;
}

module.exports = {
    readCsv,
    writeCsv,
    scrollToEnd,
    getRandomElement,
    downloadImages,
    login,
    convertToEnglishNumber,
    getBrowser,
    delay,
    shuffleArray,
    checkMemoryUsage,
    getCpuUsagePercentage,
    checkMemoryCpu,
    persionMonthToDigit,
    click,
    isNumeric,
    scrollModals,
};
