const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client();
var fs = require("fs");

var activeWOTDServerArray = [];
var lastSessionTimeout = false;

var wotdlooptimeout;
var bootTime = new Date().getTime();
var lastPostDate = new Date().getUTCDate();
var lastPostHour = new Date().getUTCHours();

var rngToday = Math.random();

var nounlist = fs.readFileSync("./nounlist.txt", { "encoding": "utf-8" }).split("\n");
try {
    var prevSessData = fs.readFileSync("./prevSessData.txt", { "encoding": "utf-8" }).split("\n\r");

    if (prevSessData[0] == "" + new Date().getUTCFullYear() + new Date().getUTCMonth() + new Date().getUTCDate() + new Date().getUTCHours() + " ") {
        console.log("Server was down for less than an hour.");
    } else {
        lastSessionTimeout = true;
        console.log("Server was down for more than an hour.");
    }

    for (var i = 1; i < prevSessData.length; i++) {
        activeWOTDServerArray[i - 1] = { id: prevSessData[i].split(" ")[0], time: prevSessData[i].split(" ")[1] };
    }
} catch (err) { }

client.on("ready", () => {
    console.log("Initialized.");
    console.log("Today's word: " + getNoun());

    if (lastSessionTimeout) {
        for (var i = 0; i < activeWOTDServerArray.length; i++) {
            var currentChannel = client.channels.get(activeWOTDServerArray[i].id);
            currentChannel.send("WordOfTheDayBot has been down for too long. You will need to manually re-enable Word of the Day.");
        }

        activeWOTDServerArray = [];
    }

    function wotdloop() {
        if (lastPostDate != new Date().getUTCDate()) {
            rngToday = Math.random();
            lastPostDate = new Date().getUTCDate();
        }

        if (lastPostHour != new Date().getUTCHours()) {
            for (var i = 0; i < activeWOTDServerArray.length; i++) {
                if (activeWOTDServerArray[i].time == new Date().getUTCHours()) {
                    postNoun(activeWOTDServerArray[i].id, getNoun());
                }
            }

            lastPostHour = new Date().getUTCHours();
        }

        updateSessData();
        
        wotdlooptimeout = setTimeout(wotdloop, 1000);
    }
    wotdloop();

});

client.on("message", (message) => {
    if (message.author.bot) return;
    var command = message.content.toLowerCase();

    if (command.split(" ")[0] == "wotd") {
        if (command.split(" ")[1] == "ping") {
            message.channel.send("pong!");
        }

        if (command.split(" ")[1] == "?" || command.split(" ")[1] == "help") {
            message.channel.send("Commands:\n---------------------------------\nwotd\nPosts the word of the day.\n---------------------------------\nwotd start [time]\nSets WotDBot to automatically post the word of the day. [time] is an integer between 0 and 23, representing time in hours (UTC). Without it, the bot either sets it to midnight (0) or checks if it's already set.\n---------------------------------\nwotd stop\nMakes the bot stop posting automatically.\n---------------------------------\nwotd (? or help)\nPosts this help message.");
            //message.channel.send("---------------------------------");
            //message.channel.send("wotd");
            //message.channel.send("Posts the word of the day.");
            //message.channel.send("---------------------------------");
            //message.channel.send("wotd start [time]");
            //message.channel.send("Sets WotDBot to automatically post the word of the day. [time] is an hour integer between 0 and 23. Without it, the bot either sets it to midnight or checks if it's already set.");
            //message.channel.send("---------------------------------");
            //message.channel.send("wotd stop");
            //message.channel.send("Makes the bot stop posting automatically.");
            //message.channel.send("---------------------------------");
            //message.channel.send("wotd (? or help)");
            //message.channel.send("Posts this help message.");
        }

        if (command.split(" ").length == 1) {
            postNoun(message.channel.id, getNoun());
        }

        if (command.split(" ")[1] == "start") {
            var preexistingEntry = "undefined";
            for (var i = 0; i < activeWOTDServerArray.length; i++) {
                if (activeWOTDServerArray[i].id == message.channel.id) {
                    preexistingEntry = i;
                }
            }

            if (preexistingEntry == "undefined") {
                if (command.split(" ")[2] == undefined) {
                    activeWOTDServerArray[activeWOTDServerArray.length] = { id: message.channel.id, time: '0' };
                    message.channel.send("Word of the Day has now been enabled for this channel, post time set to " + getTimeText(0) + ".");
                } else {
                    if (parseInt(command.split(" ")[2]) < 0 || parseInt(command.split(" ")[2]) > 23) {
                        message.channel.send("Error: " + command.split(" ")[2] + " is not a valid time to set it to. It should be an integer between 0 and 23.");
                    } else {
                        message.channel.send("Word of the Day has now been enabled for this channel, post time set to " + getTimeText(command.split(" ")[2]) + ".");
                        activeWOTDServerArray[activeWOTDServerArray.length] = { id: message.channel.id, time: parseInt(command.split(" ")[2]) };
                    }
                }
            } else {
                if (activeWOTDServerArray[preexistingEntry].time == command.split(" ")[2]) {
                    message.channel.send("Word of the Day has already been enabled for this channel.");
                } else {
                    if (command.split(" ")[2] == undefined) {
                        message.channel.send("Word of the Day has already been enabled for this channel.");
                    } else {
                        if (parseInt(command.split(" ")[2]) < 0 || parseInt(command.split(" ")[2]) > 23) {
                            message.channel.send("Word of the Day has already been enabled for this channel. " + command.split(" ")[2] + " is not a valid time to set it to. It should be an integer between 0 and 23.");
                        } else {
                            message.channel.send("Word of the Day has already been enabled for this channel, post time changed from " + getTimeText(activeWOTDServerArray[preexistingEntry].time) + " to " + getTimeText(command.split(" ")[2]) + ".");
                            activeWOTDServerArray[preexistingEntry].time = parseInt(command.split(" ")[2]);
                        }
                    }
                }
            }

            updateSessData();
        }

        if (command.split(" ")[1] == "stop") {
            var arrayIndex = "undefined";
            for (var i = 0; i < activeWOTDServerArray.length; i++) {
                if (activeWOTDServerArray[i].id == message.channel.id) {
                    arrayIndex = i;
                }
            }

            if (arrayIndex == "undefined") {
                message.channel.send("Word of the Day is not currently enabled on this channel. If it is, and this error is happening, please contact the developer.");
            } else {
                activeWOTDServerArray.splice(arrayIndex, 1);
                message.channel.send("Word of the Day is now disabled on this channel.");
            }

            updateSessData();
        }

        if (command.split(" ")[1] == "debug") {
            //console.log("activeWOTDServerArray = " + activeWOTDServerArray); //RETURNS OBJECT OBJECTS, USELESS.
        }
    }



    
});

function getNoun() {
    return nounlist[parseInt(rngToday * nounlist.length)];
}

function postNoun(serverID, noun) {
    var currentChannel = client.channels.get(serverID);
    currentChannel.send("The word of the day is " + noun + ".");
    currentChannel.send("https://www.google.dk/search?q=" + noun);
    currentChannel.send("https://www.google.dk/search?tbm=isch&q=" + noun);
}

function updateSessData() {
    var timeStamp = "" + new Date().getUTCFullYear() + new Date().getUTCMonth() + new Date().getUTCDate() + new Date().getUTCHours();

    var serverArrayTextDump = "";

    for (var i = 0; i < activeWOTDServerArray.length; i++){
        serverArrayTextDump += "\n\r" + activeWOTDServerArray[i].id + " " + activeWOTDServerArray[i].time;
    }

    fs.writeFile('prevSessData.txt', timeStamp + " " + serverArrayTextDump, function (err) {
        if (err) throw err;
    });
}

function getTimeText(time) {
    time = parseInt(time);
    if (time == 0) {
        return "midnight (UTC)";
    } else {
        return time + ":00 UTC"
    }
}

client.login(config.token);

