var puppeteer = require("puppeteer");
const cheerio = require('cheerio');
const tools = require("../connect.js");

const getHistory = async () => {
    var historysql = "SELECT crh.`id`, crh.`sportname`, crh.`Tournaments`, crh.`team`, crh.`score`, crh.`date`, crh.`amount`, crh.code FROM crawhistory crh  WHERE crh.`id` not in (SELECT crawid FROM `battle` WHERE bot_id= 5)";
    tools.selectSql(historysql, (err, res) => {
        if (err || res.length === 0) return callback();

        Login2bet(res);
    });
};

const Login2bet = async (res = [], callback) => {
    var sqlAcount = "SELECT `id`, `botname`, `username`, `password`, `amount`, `max_score` FROM `bot` WHERE delf = 0 AND id = 5";
    tools.selectSql(sqlAcount, async (erracc, resacc) => {
        if (erracc) return erracc;
        if (resacc.length > 0) {
            var username = resacc[0]?.username;
            var password = resacc[0]?.password;
            var amountPet = resacc[0]?.amount;
            var max_score = resacc[0]?.max_score;


            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();
            const pages = await browser.pages();
            if (pages.length > 1) {//đóng tap trống đầu tiên
                await pages[0].close();
            }
            await page.setDefaultNavigationTimeout(0);//set thời gian chờ tải trang  không giới hạn

            await page.goto("https://2bet.ag/");
            await page.waitForSelector("input[name='bpLoginUsername']");
            await page.type("input[name='bpLoginUsername']", username, { delay: 100 });
            await page.type("input[name='bpLoginPassword']", password, { delay: 100 });

            await page.waitForSelector("#bpLoginSubmit");
            await page.click("#bpLoginSubmit");

            const date = new Date();
            const datetime = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

            await tools.InserSql("INSERT INTO `last_login`( `bot_id`, `time`) VALUES (5, '" + datetime + "')");

            await page.waitForNavigation({
                waitUntil: "networkidle2",
            })

            for (let i = 0; i < res.length; i++) {
                var item = res[i];
                await page.waitForSelector("section.cont-right.clearfix div.sport-league div.panel-heading div.menu-sport-name h3")
                var contentPage = await page.content();
                var $ = cheerio.load(contentPage);
                $.html();
                var inputval = "";
                var idsubmit = "";
                var datacheckbox = [];
                await page.waitForSelector("section ul.nav-sidebar")

                ///đưa các môn thể thao bên sidebar ra ngoài
                const checkboxlist = await page.$$('section ul.nav-sidebar li');
                for (let i = 0; i < checkboxlist.length; i++) {
                    var checkbox = checkboxlist[i];
                    const display = await page.evaluate(el => getComputedStyle(el).getPropertyValue('display'), checkbox);
                    if (display != "none") {
                        var sportName = (await page.evaluate(text => text.innerText, checkbox));
                        if (sportName.search("FOOTBALL") > -1 || sportName.search("BASKETBALL") > -1) {
                            await checkbox.$eval('a', el => el.click())
                        }

                    }
                }
                $('section.cont-right.clearfix div.sport-league div.panel-heading div.menu-sport-name h3').each(function () {
                    if ($(this).text().trim().search("FOOTBALL") > -1 || $(this).text().search("BASKETBALL") > -1) {
                        const content = $(this).parents('div.sport-league').find('div.panel-body ul li');
                        if (idsubmit == "") {
                            idsubmit = $(this).parents('div.sport-league').attr('id');
                        }
                        content.each(function () {
                            datacheckbox.push($(this).find("input").val())
                        });
                        return;
                    }
                });

                if (datacheckbox.length > 0 && idsubmit != "") {
                    //tích chọn các loại môn    
                    for (let i = 0; i < datacheckbox.length; i++) {
                        await page.$eval("input[value='" + datacheckbox[i] + "']", check => check.checked = true)
                    }
                    await page.waitForTimeout(100)
                    await page.waitForSelector(`div#${idsubmit}`);
                    var continuebt = await page.$(`div#${idsubmit} .panel-heading .panel-btn button.btn-success`);
                    await continuebt.click()
                    await page.waitForNavigation({
                        waitUntil: "networkidle2",
                    })
                    await page.waitForSelector("#lines-form");
                    await page.waitForSelector("table.table")
                    var contentPage = await page.content();
                    const $ = cheerio.load(contentPage);
                    var valueInput = '';
                    var idsportSuggest = "";
                    var scoreChoosed = "";

                    var itemScorearr = item?.score?.split(/[-+]/);
                    var ItemscoreEnd = itemScorearr[itemScorearr.length - 1];
                    var ItemscoreStart = item?.score.slice(0, item?.score.indexOf(itemScorearr[itemScorearr.length - 1]));

                    $('tbody tr td span.rot').each(function () {
                        if ($(this).text().trim() == item?.code) {
                            const content = $(this).parents("tr").find('td.txt-r');
                            content.each(function () {
                                var NameScore = "";
                                var strarr = "";
                                var scoreEnd = "";
                                var scoreStart = "";
                                if ($(this).find("span.game-lines span.l-checkbox select").length > 0) {
                                    var option = $(this).find("span.game-lines span.l-checkbox select option")
                                    option.each(function () {
                                        NameScore = $(this).text().trim().replace(/\s+/g, '');
                                        strarr = NameScore.split(/[-+]/);
                                        scoreEnd = strarr[strarr.length - 1];
                                        scoreStart = NameScore.slice(0, NameScore.indexOf(strarr[strarr.length - 1]));
                                        if (ItemscoreStart?.toUpperCase() == scoreStart?.toUpperCase() && scoreEnd <= (Number(ItemscoreEnd) + Number(max_score))) {
                                            page.$eval("option[value='" + $(this).val() + "']", check => check.selected = true)
                                            idsportSuggest = $(this).parents("span.game-lines").find("input[type='checkbox']").val();
                                            //console.log("kq:",NameScore);
                                            scoreChoosed = NameScore;
                                            return;
                                        }
                                    })

                                } else {
                                    NameScore = $(this).find("span.game-lines span.l-checkbox").text().trim().replace(/\s+/g, '');
                                    strarr = NameScore.split(/[-+]/);
                                    scoreEnd = strarr[strarr.length - 1];
                                    scoreStart = NameScore.slice(0, NameScore.indexOf(strarr[strarr.length - 1]));
                                }
                                if (idsportSuggest == "" && ItemscoreStart?.toUpperCase() == scoreStart?.toUpperCase() && scoreEnd <= (Number(ItemscoreEnd) + Number(max_score))) {
                                    if ($(this).find("span.game-lines span.l-checkbox select").length > 0) {
                                        idsportSuggest = $(this).find("span.game-lines span.l-checkbox input[type='checkbox']").val();
                                        scoreChoosed = $(this).find("span.game-lines span.l-checkbox select option:selected").text().trim().replace(/\s+/g, '')
                                    } else {
                                        idsportSuggest = $(this).find("span.game-lines span.l-checkbox input[type='checkbox']").val();
                                        scoreChoosed = $(this).find("span.game-lines span.l-checkbox").text().trim().replace(/\s+/g, '')
                                    }

                                }
                            });
                            return;
                        }
                    })
                    if (valueInput == "" && idsportSuggest != "") {
                        valueInput = idsportSuggest;
                    }

                    if (valueInput != "") {
                        // console.log(222222222, valueInput)
                        await page.click("input[value='" + valueInput + "']");
                        await page.waitForTimeout(100)
                        await page.click('div.panel.panel-primary.row div.panel-btn button[type="button"].btn.btn-success');
                        await page.waitForNavigation({
                            waitUntil: "networkidle2",
                        })

                        await page.type("input[id='same-amt']", `${amountPet}`, { delay: 100 })
                        await page.click("button[type='button'].btn-success.btn-continue");
                        await page.waitForNavigation({
                            waitUntil: "networkidle2",
                        })
                        const checkerr = (await page.$$("tbody tr td span.team-name")).length;
                        ////////////////////
                        //console.log("kq:", idsportSuggest);

                        //console.log("kq:",scoreStart);
                        //console.log("kq:",scoreEnd);
                        //console.log("kq:",scoreEnd);
                        //console.log("Score:", scoree);



                        if (checkerr > 0) {
                            var WagerType = await page.$eval("h3.panel-title", el => el.textContent);
                            var dateevent = await page.$eval("tbody tr td span.date", el => el.textContent)
                            var Team = await page.$eval("tbody tr td span.team-name", el => el.textContent)
                            var linedesc = await page.$eval("tbody tr td span.line-desc", el => el.textContent)
                            var Tournaments = item?.Tournaments;
                            var amount = (await page.$eval("tbody tr td.amts", el => el.textContent)).trim()
                            var valueevent = [[5, item?.sportname, Tournaments, Team, scoreChoosed, dateevent, item?.date, WagerType, amount, item?.id, 1]];

                            await page.waitForTimeout(1000);
                            await page.type("input[name='pw']", password, { delay: 100 });

                            await tools.InserSql("INSERT INTO `battle`( `bot_id`, `sport`, `Tournaments`, `team`,`score`, `date`, `DatePlaced`, `WagerType`, `amount`,`crawid`, `status`) VALUES ?", valueevent);
                            await page.click("button[type='button'].btn-success.btn-submit");

                            if (i < res.length - 1) {
                                await page.waitForSelector("a.dropdown-toggle.active[data-toggle='dropdown']");
                                await page.click("a.dropdown-toggle.active[data-toggle='dropdown']");
                                await new Promise(resolve => setTimeout(resolve, 600));
                                await page.waitForSelector("li.dropdown.open a[href='/xv/sports?wt=0']");
                                await page.click("li.dropdown.open a[href='/xv/sports?wt=0']");
                                await new Promise(resolve => setTimeout(resolve, 500));
                            } else {
                                // await tools.endconnect();
                                browser.close();
                                // callback()
                            }
                        } else {
                            var valueevent = [[5, item?.sportname, item?.Tournaments, item?.team, item?.score, datetime, item?.date, '', amountPet, item?.id, 0]];
                            await tools.InserSql("INSERT INTO `battle`( `bot_id`, `sport`, `Tournaments`, `team`,`score`, `date`, `DatePlaced`, `WagerType`, `amount`,`crawid`, `status`) VALUES ?", valueevent);

                            if (i < res.length - 1) {
                                await page.waitForSelector("a.dropdown-toggle.active[data-toggle='dropdown']");
                                await page.click("a.dropdown-toggle.active[data-toggle='dropdown']");
                                await new Promise(resolve => setTimeout(resolve, 600));
                                await page.waitForSelector("li.dropdown.open a[href='/xv/sports?wt=0']");
                                await page.click("li.dropdown.open a[href='/xv/sports?wt=0']");
                                await new Promise(resolve => setTimeout(resolve, 500));


                            } else {
                                // await tools.endconnect();
                                browser.close();
                                // callback()
                            }
                        }


                    } else {
                        var valueevent = [[5, item?.sportname, item?.Tournaments, item?.team, item?.score, datetime, item?.date, '', amountPet, item?.id, 2]];
                        await tools.InserSql("INSERT INTO `battle`( `bot_id`, `sport`, `Tournaments`, `team`,`score`, `date`, `DatePlaced`, `WagerType`, `amount`,`crawid`, `status`) VALUES ?", valueevent);
                        if (i < res.length - 1) {
                            await page.waitForSelector("a.dropdown-toggle.active[data-toggle='dropdown']");
                            await page.click("a.dropdown-toggle.active[data-toggle='dropdown']");
                            await new Promise(resolve => setTimeout(resolve, 600));
                            await page.waitForSelector("li.dropdown.open a[href='/xv/sports?wt=0']");
                            await page.click("li.dropdown.open a[href='/xv/sports?wt=0']");
                            await new Promise(resolve => setTimeout(resolve, 500));

                        } else {
                            // await tools.endconnect();
                            browser.close();
                            // callback()
                        }
                    }

                } else {
                    var valueevent = [[5, item?.sportname, item?.Tournaments, item?.team, item?.score, datetime, item?.date, '', amountPet, item?.id, 2]];
                    await tools.InserSql("INSERT INTO `battle`( `bot_id`, `sport`, `Tournaments`, `team`,`score`, `date`, `DatePlaced`, `WagerType`, `amount`,`crawid`, `status`) VALUES ?", valueevent);
                    if (i < res.length - 1) {
                        await page.waitForSelector("a.dropdown-toggle.active[data-toggle='dropdown']");
                        await page.click("a.dropdown-toggle.active[data-toggle='dropdown']");
                        await page.waitForSelector("li.dropdown.open a[href='/xv/sports?wt=0']");
                        await new Promise(resolve => setTimeout(resolve, 600));
                        await page.click("li.dropdown.open a[href='/xv/sports?wt=0']");
                        await new Promise(resolve => setTimeout(resolve, 500));

                    } else {
                        // await tools.endconnect();
                        browser.close();
                        // callback()
                    }
                }

            }
        }
    })

}
// getHistory(() => { console.log(1); process.exit() })
module.exports = { getHistory };