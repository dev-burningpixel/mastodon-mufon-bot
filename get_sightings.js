/*
MUFON Last 20 Reports bot for Mastodon

Downloads list from https://mufoncms.com/last_20_report_public.html and posts today's sightings

Using cron, run once a day to download list at 4:20AM

table sightings

CREATE TABLE sightings (
    case_id INTEGER PRIMARY KEY,
    case_number INTEGER NOT NULL,
    date_submitted TEXT NOT NULL,
    date_event TEXT,
    short_description TEXT,
    city TEXT,
    state_country TEXT,
    attachments TEXT,
    toot TEXT,
    posted BOOL
);
*/

import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import addSighting from "./sightingsDB.js";
import sqlite3 from "sqlite3";

// download html data and parse
// then check if to add the sighting to the local db
async function getSightings() {
    let mufonResp = null;
    let mufonBody = null;

    try {
        mufonResp = await fetch("https://mufoncms.com/last_20_report_public.html");
    } catch (err) {
        console.error(err);
        return;
    }

    if (mufonResp && mufonResp.status == 200) {
        console.log("parsing last_20_report_public.html");

        try {
            mufonBody = await mufonResp.text();

            if (mufonBody) {
                console.log(mufonBody);
                const mufonParser = new JSDOM(mufonBody);
                const mufonDOM = mufonParser.window.document;

                let reportRows = mufonDOM.querySelectorAll("table tr");

                // since the table is the same thing, for now, skip first two table rows found
                // which is just the headers
                for (let i = 2; i < reportRows.length; i++) {
                    let rowData = reportRows[i];
                    console.log("\n[" + i.toString() + "] =======")
                    let splitData = rowData.textContent.split("\n");

                    // knowing the structure, the data is between 1-7
                    let sighting = {
                        "case_number": parseInt(splitData[1]),
                        "date_submitted": splitData[2].replace(/\s+/g, ' ').trim(),
                        "date_event": splitData[3].replace(/\s+/g, ' ').trim(),
                        "short_description": splitData[4].replace(/\s+/g, ' ').trim(),
                        "city": splitData[5].replace(/\s+/g, ' ').trim(),
                        "state_country": splitData[6].replace(/\s+/g, ' ').trim(),
                        "attachments": splitData[7].replace(/\s+/g, ' ').trim()
                    };

                    let sighting_post = "[case number] " + sighting["case_number"] + "\n";
                    sighting_post += "[date submitted] " + sighting["date_submitted"];

                    if (sighting["date_event"] != "") {
                        sighting_post += "\n[data of event] " + sighting["date_event"] + "\n";
                    } else {
                        sighting_post += "\n[data of event] none\n";
                    }

                    sighting_post += "[city] " + sighting["city"] + "\n[state/country] " + sighting["state_country"] + "\n";

                    if (sighting["attachments"] != "") {
                        sighting_post += "[attachments] " + sighting["attachments"];
                    } else {
                        sighting_post += "[attachments] none";
                    }

                    sighting_post += "\n\n" + sighting["short_description"] + "\n\n";
                    sighting_post += "#ufo #mufon #ufomastodon #mufonmastodon #truthisoutthere"

                    console.log(sighting_post);

                    sighting["toot"] = sighting_post;

                    const db = new sqlite3.Database("./local.db");
                    await db.serialize(() => {
                        db.all("SELECT * FROM sightings WHERE case_number = ?", sighting.case_number, async (err, rows) => {
                            if (err) {
                                console.error(err);
                            }

                            if (rows.length == 0) {
                                console.log("sending to database case #" + sighting.case_number);
                                await addSighting(sighting);
                            } else {
                                console.log("skipping case #" + sighting.case_number);
                            }
                        });
                    });
                }


            }

        } catch (err) {
            console.error(err);
            return;
        }
    }
}


async function main() {
    await getSightings();
}


try {
    console.log("starting mufon bot...");
    main();
} catch (err) {
    console.error(err);
}