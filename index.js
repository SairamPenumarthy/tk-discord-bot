const { Client, Intents } = require("discord.js");
var Scraper = require('images-scraper');
const { joinVoiceChannel } = require('@discordjs/voice');
const voice = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const play = require('play-dl');
const { createAudioPlayer } = require('@discordjs/voice');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const { AudioPlayerStatus } = require('@discordjs/voice');



// The Client and Intents are destructured from discord.js, since it exports an object by default. Read up on destructuring here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
});
const google = new Scraper({
    puppeteer: {
      headless: false,
    },
});
const config = require("./config.json");

client.on("ready", () => {
  console.log("Tahmas is ready!");
});

const queue = new Map();
const player = createAudioPlayer();

// detects messages
client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    //  !help => lists out possible commands/formats
    if (message.content.startsWith("-help")) {
        message.channel.send("-hi:\tTahm Kench acknowledges your existence\n-rate [user mention]:\tTahm Kench rates the user(s)\n-talk:\tTahm Kench says something with profundity\n-grill:\tTahm Kench sends you a lovely grilling meme");
    }

    //  !hi => requests formal greetings from Tahm Kench
    if (message.content.startsWith("-hi")) {
        message.channel.send("Hello <@!" + message.author.id + ">");
    }

    //  !rate => rate mentioned users
    if (message.content.startsWith('-rate')) {
        message.mentions.users.forEach((k, v) => {
            message.channel.send("<@!" + v + "> is " + (Math.floor(Math.random() * 101)) + "% cool.");
        })
    }

    // !talk => sends random tk quote
    if (message.content.startsWith("-talk")) {
        message.channel.send(getRandomQuote());
    }

    if (message.content.startsWith("-grill")) {
        (async () => {
            const results = await google.scrape('grilling memes', 300);
            message.channel.send(results[Math.floor(Math.random() * 300)].url);
        })();
    }

    if (message.content.startsWith("-play ")) {
        if (message.content.length > 6) {
            if (message.channel.type !== 'GUILD_TEXT') return;
            (async () => {
                const voice_channel = message.member.voice.channel;
                if (!voice_channel) {
                    return message.reply('Please join a voice channel first!');
                }
                const permissions = voice_channel.permissionsFor(message.client.user);
                if (!permissions.has('CONNECT')) return message.channel.reply("Tahm Kench isn't allowed in vc :(");
                if (!permissions.has('SPEAK')) return message.channel.reply("Tahm Kench is being oppressed from speaking :(");
                const server_queue = queue.get(message.guild.id);
                let song = {};
                let args = message.content.substring(6);
                if (ytdl.validateURL(args)) {
                    const song_info = await ytdl.getInfo(args);
                    song = { title: song_info.videoDetails.title, url: song_info.videoDetails.url };
                } else {
                    const video_finder = async (query) =>{
                        const videoResult = await ytSearch(query);
                        return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
                    }
                    const video = await video_finder(args);
                    if (video) {
                        song = { title: video.title, url: video.url }
                    } else {
                        message.channel.reply('Error finding video');
                    }
                }

                if (!server_queue) {
                    const queue_constructor = {
                        voice_channel: voice_channel,
                        text_channel: message.channel,
                        connection: null,
                        songs: []
                    }
                    queue.set(message.guild.id, queue_constructor);
                    queue_constructor.songs.push(song);
        
                    try {
                        const connection = joinVoiceChannel({
                            channelId: message.member.voice.channel.id,
                            guildId: message.member.voice.channel.guild.id,
                            adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
                        });
                        connection.subscribe(player);
                        queue_constructor.connection = connection;
                        video_player(message, message.guild, queue_constructor.songs[0]);
                    } catch (err) {
                        queue.delete(message.guild.id);
                        message.reply("Couldn't connect");
                        throw err;
                    }
                } else {
                    server_queue.songs.push(song);
                    return message.channel.send(`**${song.title}** added to queue`);
                }
            })();
        } else {
            message.reply("Need song name");
        }
    }

    if (message.content.startsWith("-pause")) {
        player.pause();
    }

    if (message.content.startsWith("-resume")) {
        player.unpause();
    }

    if (message.content.startsWith("-stop")) {
        player.stop();
        server_queue = {};
    }

    if (message.content.startsWith("-join")) {
        joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.member.voice.channel.guild.id,
            adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
        });
    }

    if (message.content.startsWith("-leave")) {
        voice.getVoiceConnection(message.guild.id + "").disconnect();
    }
});

const video_player = async (message, guild, song) => {
    const song_queue = queue.get(guild.id);

    if (!song) {
        voice.getVoiceConnection(message.guild.id + "").disconnect();
        queue.delete(guild.id);
        return;
    }

    const stream = await play.stream(song.url);
    let resource = createAudioResource(stream.stream, {
        inputType: stream.type
    })
    player.play(resource);
    player.on(AudioPlayerStatus.Idle, () => {
        song_queue.songs.shift();
        video_player(message, guild, song_queue.songs[0]);
    });
    await message.channel.send(`Now Playing **${song.title}**`);
}

function getRandomQuote() {
    const quotes = [
        "I see nothing splendiferous in this table's offerings!",, 
        "It is my mouth into which all travels end.",, 
        "Let us peruse this establishment's fare.",,
        "It is the heart from which the darkest water flows.",,
        "This buffet exceeds repugnance!",
        "Does your establishment have any tables?",
        "My diet is expensively unique.",
        "From suffering, my banquet is born.",
        "Gluttony is impossible.",
        "No true hunger can be abated.",
        "To covet is to starve.",
        "I have tastes that aren't easily... pacified.",
        "Every heart has its own hunger.",
        "All the world's a river - and I'm its king.",
        "All creation is born famished and starving.",
        "Everyone ends downriver... eventually.",
        "Nothing escapes hunger.",
        "I refuse to succumb to culinary degradation!",
        "We all gourmandize from time to time.",
        "The only real sin is to deny a craving.",
        "Misery has a delectable taste.",
        "Anything of depth is deceitful.",
        "A depth of flavor is what I covet.",
        "I am appetite focused.",
        "True appetite never wanes.",
        "All shall drown in my magnificence.",
        "Let us eat voraciously and overindulge.",
        "Now we shall gluttonize.",
        "Every river ends in me!",
        "A bargain is due!",
        "The world is my feast!",
        "Mercy has no flavor!",
        "I am the River King!",
        "The river never stops!",
        "That aroma seduces... ",
        "Where is that taste?",
        "Where is it!?",
        "Hunger!",
        "*Tahm snarls*",
        "Give it to me!",
        "I demand an entrée!",
        "You are a malodorous offense to my palate!",
        "The baseness of your appetite repulses me!",
        "Your mind is as clear as mud.",
        "Child, you're a couple cows short of a steak!",
        "You're duller than a broken sandwich.",
        "War is a manly appetite, and your directness has my admiration.",
        "Brother, you're as cultured as a crematorium selling barbecue.",
        "I am enthralled by your class and refinement - I must offer you a token of my admirations.",
        "You're as modest as a freshly-paid courtesan.",
        "Any pejorative of bullheadedness is pulverized by your magnificence.",
        "I believe 'decorum' is the china shop.",
        "Coveting friendship is barely an appetite - but one I do so sympathize with.",
        "I say, you're as 'fun' as a leaky roof.",
        "Idiocy is often mistaken for innocence.",
        "If you wanna' build an empire of peace, then your mortar will be blood.",
        "Girl, you got as much 'foresight' as a blindfolded mole.",
        "If your heart is gold and your body is steel, why's tin between your ears?",
        "You're strong like bull, and smart like cow.",
        "My mustache will eat yours.",
        "You're as elegant as an outhouse in a leper colony!",
        "Your hunger deserves to be satisfied.",
        "Personally I hunger for things less literal.",
        "You're as subtle as a gold codpiece.",
        "Vengeance is a thirst I could help you quench.",
        "Girl, you're crazier than a mouse in moonshine.",
        "Your hunger for attention deserves to be sated.",
        "At least the rumor of your vanity isn't overrated.",
        "Your diction is as exemplary as your intellect.",
        "Time is but another river - and I care not what water I swim in.",
        "Your youthful rebellion is as tedious as your hairstyle.",
        "Why should a hunger for adventure ever be sated?",
        "Youthful ignorance is unfortunately your best quality.",
        "An appetite for a challenge is a craving without liability.",
        "A duel is a fight between two imbeciles... and you are the greatest.",
        "Wouldn't you care to travel to your people's destination?",
        "You're a man with troubles. I have solutions.",
        "Your attempt to be monstrous is as successful as your dictatorship.",
        "Time is just a river, boy, let me take you back where you belong.",
        "Your conversation makes as much sense as a fish in lingerie!",
        "I admire a man of appetites - let me help you find refreshment.",
        "Your tastes are as elegant as a broken latrine.",
        "Girl, you're as appealing as a cake in the rain.",
        "It is wonderful to be hungry for a challenge.",
        "Boy, you are a few candles short of a lantern.",
        "A drive for innovation? It's just a hunger for something new.",
        "Dumber than a box of hammers.",
        "An appetite for chaos? Let me feed that mayhem.",
        "Girl, if brains were dynamite, you'd be a dud.",
        "Truth requires a journey on blind faith.",
        "Good ideas fall from you like pudding from a harpy.",
        "Step closer, and I'll carry you to your prize.",
        "A fool and his love are easily parted.",
        "The road to vengeance requires a journey I would happily provide.",
        "The enormity of the hat doesn't hide the vacancy beneath it!",
        "Forgiveness is a shore like any other.",
        "You're like a roofless mansion - impressively useless.",
        "Allow me to facilitate your rapaciousness.",
        "I appreciate your mind is unsullied by the complications of reason.",
        "You read words and mistake that for understanding.",
        "Let me make a meal with your ambition.",
        "You're as witty as you are subtle.",
        "Your tastes are about as sophisticated as your wardrobe.",
        "You're as likable as a rat in a bridle shop.",
        "A gambler's luck is only predictable... when he's a cheat.",
        "A boxer who thinks with her fists must inevitably punch with her face.",
        "Ah, nothing whets my appetite like the flames of ambition gone awry.",
        "A slave's mind is never free, but I suspect you got yours on discount.",
        "Your destiny isn't in the wind - it's on the river.",
        "You're as quick as a turtle on molasses.",
        "Child, a shadow must run from the light eventually.",
        "I presume you are the waiter at this establishment.",
        "Are you the waiter of this establishment?",
        "Hunger!",
        "Feed!",
        "More!",
        "Meat!",
        "Dinner!",
        "Fresh souls!",
        "Mine!",
        "This is my river, you scoundrel!",
        "You dare invade my table?",
        "Beast, you are a rank dish! Ill served!",
        "How delectable.",
        "Another meal.",
        "Delicious.",
        "Savor the misery.",
        "An enticing culinary prospect.",
        "New tastes.",
        "I will consume all.",
        "Something to nibble on.",
        "A feast awaits.",
        "Their despair... is the seasoning.",
        "I must sample this buffet.",
        "Another snack.",
        "Yummy.",
        "Might be savory.",
        "Travel awaits.",
        "Step inside.",
        "Closer.",
        "Take the bargain.",
        "This way!",
        "Get inside!",
        "Over here!",
        "Come closer, child.",
        "Vile!",
        "Disgusting!",
        "Nauseating!",
        "Revolting!",
        "Repugnant!",
        "Unacceptable!",
        "Needs salt!",
        "You have succeeded only in ruffling my attire!",
        "My constitution is unflappable!",
        "Was that an attack, or an hors d'oeuvre?",
        "How droll your attacks are!",
        "A heart is so easily... eaten.",
        "There is something sublime about holding a heart in your hand.",
        "I can provide all manner of refuge.",
        "I am sanctuary for those in my favour.",
        "How did I leave my jacket pocket unadorned for so long?",
        "I have a hunger for... fine shoes.",
        "I am an omen of voracity.",
        "A little sedation for my more noisesome neighbours.",
        "I wonder who might like to bargain for a little freedom.",
        "I pity the hydra. So many heads intent on sharing the meal.",
        "My visage was already flawless, now it just has more vigor.",
        "I refuse to trouble myself with charlatans.",
        "Sorcery is a distasteful habit.",
        "A gentleman without a cape is only half-dressed.",
        "Fire warms the spirit, and charges the appetite.",
        "War is an appetite like any other.",
        "A hearty appetite pairs best with a robust constitution.",
        "Say what you will - a large man can not be ignored.",
        "Finally, my enormity matches my appetite.",
        "I prefer to know when my next meal approaches.",
        "Even when you have no bait, you can still cast a line and hope.",
        "I search for bargains wherever fools cross my domain.",
        "A true meal requires foresight to manifest.",
        "Regrettably, I must retire in order to find a digestive.",
        "I shall return to this establishment shortly."
    ];
    let rand = Math.floor(Math.random() * quotes.length);
    return quotes[rand];
}

client.login(config.token);