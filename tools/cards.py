# Card catalogue -> supabase/cards_seed.sql (+ tools/cards.json for previews)
# Edit the lists below, then run: python tools/cards.py
# The seed upserts every card listed here and deactivates side quests that are no longer listed
# (deactivated, not deleted: past attempts keep their card).
# Fields: id, title, body, difficulty (1-5), place, duo, tone, crush, tip, day, week, checkpoint

STORY = [  # (day, title, body, difficulty, tip)
 (1,"What time is it?","Ask a stranger for the time, phone in your pocket.",1,"Walk up, open your mouth, survive. That's it."),
 (2,"Directions","Ask someone the way to a nearby place and listen to the whole answer.",1,"Actually listen instead of planning your exit."),
 (3,"Their pick","Ask a shop assistant or waiter what they would choose, and take it.",1,None),
 (4,"Specific compliment","Compliment something precise someone chose (a book, a jacket, a dog), then leave.",1,"Specific beats generic: 'great book choice' beats 'nice'."),
 (5,"The discount","When paying, ask for a small discount.",2,"You'll probably hear no. That's the point: smile and pay."),
 (6,"Photo, take two","Ask a stranger to take your photo, then ask for a second one.",2,"Asking again is the real challenge."),
 (7,"Three in a row","Ask three different strangers a quick question today.",2,None),
 (8,"The queue","In a queue, start a chat and keep it going for one minute.",2,None),
 (9,"Follow-up","Ask someone a question, then a second one about their answer.",2,None),
 (10,"Help me choose","Ask a stranger to help you pick between two items.",2,None),
 (11,"Teach me","Ask someone to show you something they know (a word, a trick, a shortcut).",3,None),
 (12,"Names","Introduce yourself by name to someone you see often but never talked to.",3,None),
 (13,"No excuse","Start a two-minute conversation with no pretext at all.",3,None),
 (14,"The invite","Invite someone you know a little for a coffee or lunch.",3,None),
 (15,"Time, again","Ask someone you find attractive for the time or the way.",1,"Same move as day 1. Only the person changes."),
 (16,"Their pick, again","In a bookshop or café, ask someone you find attractive what they'd recommend.",2,None),
 (17,"Help me choose, again","Ask someone you find attractive to help you pick between two items.",2,None),
 (18,"Specific compliment, again","Compliment someone you find attractive on something they chose, then leave.",3,None),
 (19,"Compliment + question","Compliment, ask one question about it, and listen.",3,None),
 (20,"One minute","Chat for one minute with someone you find attractive, in a queue, a class or an event.",3,None),
 (21,"Two minutes","Two-minute conversation with someone you find attractive, no pretext, then introduce yourself.",4,None),
 (22,"Eye contact","Hold eye contact and smile with three people you find attractive.",2,None),
 (23,"Hi, I'm…","Say hi to someone you find attractive, introduce yourself, ask their name and use it when leaving.",3,None),
 (24,"Say it","After a nice exchange, tell them you enjoyed talking to them.",3,None),
 (25,"Stay in touch","After a good conversation, ask for their Instagram or number.",4,"Wrap up first, then ask: \"I have to go, but I liked talking. Can I get your Instagram?\" If no: \"No worries, nice talking to you.\""),
 (26,"The real reason","Tell someone honestly that you noticed them and wanted to say hi.",4,"Open with the truth: \"Hi, sorry to interrupt. I noticed you and wanted to say hi. I'm [name].\" Then one question about what they're doing."),
 (27,"Coffee?","Ask someone you've already talked to out for a coffee.",5,"Be specific: \"Would you like to grab a coffee this week? Thursday?\" A vague \"sometime\" is easy to dodge."),
 (28,"Cold coffee","Approach someone you don't know and ask them out for a coffee.",5,"Hi, why you came over, your name, the ask, all in under 30 seconds. Whatever the answer: smile, thank them, leave."),
 (29,"Back to day 1","Ask a stranger for the time. Write in your journal how it felt.",1,None),
 (30,"Your call","Redo the card that scared you most this month.",5,None),
]
CHECKPOINTS = {7, 14, 21, 30}

SUNDAY = [  # (week, title, body, difficulty)
 (1,"Park directions","Ask someone walking in a park or a street for the way.",1),
 (2,"Old friend","Message or call someone you haven't talked to in months and suggest a plan.",2),
 (3,"Sunday walk","In a park or an open café, ask someone you find attractive for a recommendation.",2),
 (4,"The message","Message someone you find attractive and propose a coffee next week.",4),
 (5,"The message","Message someone you find attractive and propose a coffee next week.",4),
]

# ---------------------------------------------------------------------------------------------
# SIDE QUESTS
# Difficulty = how hard it is to ask, not how likely a yes is:
#   1  tiny, expected ask; nobody finds it odd           (is this machine free? which stop?)
#   2  small ask or comment that opens a short exchange  (what would you pick? compliment)
#   3  you stand out, or ask something easy to refuse    (discount, join a group, speak up in class)
#   4  a real favour or public exposure; no is likely    (on the house, toast, ask for a number)
#   5  bold: big, unusual or public; you expect a no     (lead the warm-up, café announcement)
# Progress = real asks that build the skill. Fun = absurd but harmless; the other person must be
# able to laugh too. Duo = written for two: you both do it. Flirt = someone you find attractive.
# House rules for every card: ask before touching or filming, take the first no, never make
# someone pay for your challenge, leave people better than you found them.
# ---------------------------------------------------------------------------------------------
SITUATION = []
def card(place, d, title, body, tip=None, duo=False, fun=False, flirt=False):
    SITUATION.append((place, title, body, d, duo, "fun" if fun else "serious", flirt, tip))

# ---- class ----------------------------------------------------------------------------------
P = "class"
card(P, 1, "Notes", "Ask the person next to you if you can look at their notes for a second.")
card(P, 1, "Pen", "Ask someone near you to lend you a pen.")
card(P, 2, "Out loud", "Ask a question out loud during class.", "Any question counts. Half the room was wondering the same thing.")
card(P, 2, "After class", "Go ask the lecturer one question after class.")
card(P, 2, "New seat", "Sit next to someone you've never talked to and say hi before it starts.")
card(P, 2, "Verdict", "Ask the person next to you what they thought of today's class.")
card(P, 3, "Study group", "Propose to two classmates to work together this week, with a day and a place.")
card(P, 3, "I disagree", "Politely disagree with something said in class, out loud, and give your reason.")
card(P, 3, "Lunch?", "Ask a classmate you barely know to have lunch together today.")
card(P, 3, "To the board", "Volunteer to answer or go to the board when nobody else does.")
card(P, 4, "Announcement", "Ask the lecturer for 20 seconds at the end of class to announce something (a study group, an event), and do it.")
card(P, 4, "Join the project", "Ask a lecturer if you could help on their research or project.", "Say what you'd bring, even if it's just time and motivation.")
card(P, 4, "Second look", "Ask a teacher to look again at a grade, with real arguments.")
card(P, 5, "Five minutes", "Ask the lecturer if you can explain one point to the class yourself, next session.")
card(P, 2, "Trivia", "Ask the person next to you a weird trivia question. (How many hearts does an octopus have? Three.)", fun=True)
card(P, 2, "Snack round", "Offer your snack to the whole row.", fun=True)
card(P, 3, "Autograph", "After class, ask the lecturer to sign your notes like a celebrity would.", fun=True)
card(P, 4, "Standing ovation", "At the end of class, start a round of applause for the lecturer.", fun=True)
card(P, 5, "Theme day", "Ask the lecturer if next week's class can have a dress code (hats, shirts, colours). Make the pitch.", fun=True)
card(P, 3, "New faces", "At the break, each of you introduces yourself to a classmate you've never talked to.", duo=True)
card(P, 3, "Question relay", "In the same class, each of you asks the lecturer one question out loud.", duo=True)
card(P, 3, "Settle it", "Before class, ask the people nearby to settle a debate between you two (cats or dogs, pineapple pizza).", duo=True, fun=True)
card(P, 2, "Pen, please", "Ask someone you find attractive to lend you a pen. Give it back with a thank-you and a smile.", flirt=True)
card(P, 3, "Compare notes", "After class, ask someone you find attractive to compare notes.", flirt=True)
card(P, 4, "Walk out together", "Walk out with someone you find attractive after class and keep the chat going to the exit.", flirt=True)
card(P, 4, "Coffee after class", "Ask someone you find attractive from your class to grab a coffee right after.", "Specific and now: \"I'm getting a coffee, want to come?\"", flirt=True)
card(P, 3, "Rate my doodle", "Show someone you find attractive a doodle from your notes and ask them to rate it out of 10.", flirt=True, fun=True)

# ---- library --------------------------------------------------------------------------------
P = "library"
card(P, 1, "Charger", "Ask someone if they can lend you a charger.")
card(P, 1, "Free seat?", "Ask if the seat next to someone is free, and sit there.")
card(P, 2, "Guard my stuff", "Ask someone to watch your things while you get a coffee.")
card(P, 2, "Librarian's pick", "Ask the librarian for a book recommendation outside your field, and borrow it.")
card(P, 3, "What's that?", "Ask someone what they're reading and whether it's good.")
card(P, 3, "Explain it", "Ask someone studying your subject to explain one thing you don't get.")
card(P, 3, "Window seat", "Ask someone to swap their window seat with you.")
card(P, 3, "Lower it", "Politely ask a noisy group to keep it down.")
card(P, 4, "Coffee break", "Ask someone studying nearby to take a coffee break with you.")
card(P, 4, "Study partner", "Ask someone you often see there if they want to study together next time.")
card(P, 3, "Book oracle", "Ask a stranger to open your book at a random page and read you one sentence. That's your advice for the day.", fun=True)
card(P, 3, "Dragon cookbook", "Ask the librarian, straight-faced, for a cookbook for dragons. See what they suggest.", fun=True)
card(P, 4, "Whisper review", "Whisper-ask five people their favourite book, and write the list down.", fun=True)
card(P, 3, "Two whispers", "Each of you gets a stranger to tell you their favourite book. Compare picks over coffee.", duo=True)
card(P, 2, "Highlighter", "Ask someone you find attractive if you can borrow their highlighter.", flirt=True)
card(P, 4, "Study break", "Ask someone you find attractive what they're studying, then if they want a coffee break.", flirt=True)

# ---- café / bar -----------------------------------------------------------------------------
P = "cafe"
card(P, 1, "Barista's choice", "Order \"whatever you'd drink\".")
card(P, 1, "Wifi", "Ask the person next to you for the wifi password.")
card(P, 2, "Shared table", "When it's busy, ask to share a table.")
card(P, 2, "Worth it?", "Ask the person next to you what they ordered and if it's good.")
card(P, 2, "Taste first", "Ask to taste something before you order it.")
card(P, 3, "Free refill", "Ask for a free refill of your coffee.")
card(P, 3, "Ten minutes", "Ask someone sitting alone if you can join them for ten minutes.")
card(P, 3, "Their story", "Ask the staff how long they've worked there and what the best part is.")
card(P, 4, "On the house", "Ask if your drink can be on the house today.", "Just ask, smile, then pay normally whatever they say.")
card(P, 4, "Behind the counter", "Ask the barista if you can make your own coffee behind the counter.")
card(P, 5, "Table talk", "Ask a table of strangers if you can join their conversation for five minutes.")
card(P, 2, "Bad joke", "Tell the barista or cashier a (clean) bad joke.", fun=True)
card(P, 2, "DJ request", "Ask the bar or café to play a specific song.", fun=True)
card(P, 2, "Foam art", "Ask for a specific drawing in your latte foam: a cat, a rocket, a tiny shark.", fun=True)
card(P, 3, "Name a drink", "Ask the barista to invent a drink for you and give it a name.", fun=True)
card(P, 3, "Pastry judge", "Ask the person next to you to rate your pastry choice out of 10, with reasons.", fun=True)
card(P, 4, "Sung order", "Sing your order. One line, any tune.", fun=True)
card(P, 5, "Round of applause", "Get the café to applaud the barista. You start it, out loud, with a reason.", fun=True)
card(P, 2, "Two tables", "Each of you asks a different table what's best here. Best tip wins.", duo=True)
card(P, 4, "Join in", "Together, ask a group if you can join their game or quiz table.", duo=True)
card(P, 2, "Surprise me", "Each of you asks the barista to pick a drink for the other. No veto.", duo=True, fun=True)
card(P, 2, "The smile", "Smile at someone you find attractive and say hi as you pass.", flirt=True)
card(P, 2, "Your order?", "Ask someone you find attractive what they ordered and if it's good.", flirt=True)
card(P, 4, "Mind if I sit?", "Ask someone you find attractive if you can sit at their table, then talk.", flirt=True)
card(P, 5, "Second coffee", "Offer to buy the next coffee for someone you've just chatted with and find attractive, and stay for it.", flirt=True)
card(P, 2, "Rate the art", "Ask someone you find attractive to rate your latte art out of 10.", flirt=True, fun=True)

# ---- street / park --------------------------------------------------------------------------
P = "street"
card(P, 1, "The dog", "Ask someone if you can pet their dog.")
card(P, 1, "Local tip", "Ask someone for the best place to eat nearby.")
card(P, 2, "Photo swap", "Offer to take a photo for a group, then ask them to take yours.")
card(P, 2, "Five hellos", "Say hello to five strangers you pass, out loud, with eye contact.")
card(P, 2, "What do you think?", "Ask a stranger what they think of a building, a mural or a shop window next to you.")
card(P, 3, "Best advice", "Ask three strangers for the best advice they ever got. Write the answers down.")
card(P, 3, "Five compliments", "Give five sincere compliments to five strangers within 30 minutes.")
card(P, 4, "Walk with me", "Ask someone going your way if you can walk together for a bit.")
card(P, 4, "Bench talk", "Sit near someone on a bench and start a conversation.")
card(P, 4, "One euro", "Ask a stranger to lend you one euro, say it's for a courage challenge, and give it back right away.")
card(P, 4, "Sell it", "Try to sell a stranger an apple for one euro. Pitch it properly.")
card(P, 5, "Busker", "Ask a busker if you can sing or play one song with them.", "If they say yes, you sing. That's the deal.")
card(P, 2, "Count to ten", "Ask someone to count to ten in their language.", fun=True)
card(P, 3, "Rock, paper, scissors", "Challenge a stranger to one round.", fun=True)
card(P, 3, "Superhero name", "Ask a stranger to give you a superhero name. Use it all day.", fun=True)
card(P, 3, "Forecast", "Ask a stranger for tomorrow's weather forecast, delivered like on TV.", fun=True)
card(P, 3, "Movie of my life", "Ask a stranger to guess the title of the movie of your life.", fun=True)
card(P, 4, "Rate my walk", "Walk past a stranger, come back, and ask them to rate your walk out of 10.", fun=True)
card(P, 4, "Street reporter", "Interview a stranger for one minute like a TV reporter, phone as the mic. Ask before filming.", fun=True)
card(P, 1, "Same destination", "Each of you asks a different stranger the way to the same place. Compare routes.", duo=True)
card(P, 2, "Compliment duel", "Each of you gives a stranger a sincere compliment. The other judges.", duo=True)
card(P, 2, "High five", "Each of you gets a high five from a stranger.", duo=True, fun=True)
card(P, 2, "Quick poll", "Ask five strangers the same silly question (best pizza topping?) and tally the answers.", duo=True, fun=True)
card(P, 3, "Squad photo", "Ask a group of strangers to jump into your photo.", duo=True, fun=True)
card(P, 4, "Camera crew", "One films, one interviews a stranger about their day. Ask before filming. Then swap.", duo=True, fun=True)
card(P, 1, "Which way?", "Ask someone you find attractive for the way somewhere.", flirt=True)
card(P, 3, "Style compliment", "Compliment the style of someone you find attractive, then keep walking.", flirt=True)
card(P, 4, "Same way", "Ask someone you find attractive going your way if you can walk together.", flirt=True)
card(P, 5, "Just wanted to say hi", "Stop someone you find attractive and tell them honestly you noticed them and wanted to say hi.", "Name, the honest reason, one question. Under 30 seconds. Any answer: smile and thank them.", flirt=True)
card(P, 3, "Guess my job", "Ask someone you find attractive to guess what you do or study.", flirt=True, fun=True)

# ---- shop -----------------------------------------------------------------------------------
P = "shop"
card(P, 1, "Where is it?", "Ask a staff member where something is.")
card(P, 2, "Wrong shop", "Ask for something the shop obviously doesn't sell.")
card(P, 2, "Price check", "Ask for a discount at the till.")
card(P, 2, "Gift advice", "Ask a staff member what they'd buy for a friend with 20 euros.")
card(P, 3, "Honest opinion", "Try something on and ask a stranger what they think.")
card(P, 3, "Two for less", "Ask for a better price if you buy two.")
card(P, 3, "Staff favourite", "Ask the cashier what they'd never buy here, and why.")
card(P, 4, "Backstage", "Ask if you can see the stockroom or the kitchen.")
card(P, 4, "Sample, please", "Ask for a free sample of something that doesn't have samples.")
card(P, 5, "Shop assistant", "Ask the manager if you can sell for them for ten minutes.")
card(P, 1, "Never buy", "Ask the baker which pastry they'd never pick, and why.", fun=True)
card(P, 2, "Guess the total", "Ask the cashier to guess your total before scanning.", fun=True)
card(P, 3, "Mannequin", "Ask a staff member to take a photo of you copying the mannequin's pose.", fun=True)
card(P, 3, "Scent check", "Ask a stranger in a perfume shop which scent suits you best.", fun=True)
card(P, 5, "The announcement", "Ask to use the shop's microphone to wish a nice day to everyone.", fun=True)
card(P, 2, "Opinion poll", "Pick one item together; each of you asks a different stranger's opinion on it, then compare.", duo=True)
card(P, 2, "Style check", "Each of you tries on the worst item you can find and asks a stranger if it suits you.", duo=True, fun=True)
card(P, 3, "Stylist swap", "Each of you picks an outfit for the other and asks staff to rate both.", duo=True, fun=True)
card(P, 2, "Second opinion", "Ask someone you find attractive which of two items they'd pick.", flirt=True)
card(P, 3, "Signature scent", "Ask someone you find attractive which perfume they'd pick for you.", flirt=True)
card(P, 3, "Rate the shirt", "Hold up a shirt and ask someone you find attractive to rate it out of 10.", flirt=True, fun=True)

# ---- transport ------------------------------------------------------------------------------
P = "transport"
card(P, 1, "Which stop?", "Ask someone which stop is best for a place.")
card(P, 1, "Thanks, driver", "Thank the driver out loud when you get off.")
card(P, 1, "The window", "Ask someone if they mind opening or closing the window.")
card(P, 2, "Seat swap", "Ask someone to swap seats with you.")
card(P, 3, "Small talk", "Comment on something around you to the person next to you.")
card(P, 3, "Where to?", "Ask the person next to you where they're heading today, and why.")
card(P, 3, "Too loud", "Politely ask someone to lower their music or their call.")
card(P, 4, "All the way", "Keep a conversation going with a stranger until your stop.")
card(P, 5, "Next station", "Ask a train or tram driver if you can make the next stop announcement.")
card(P, 2, "Fun fact", "Ask a stranger for one fun fact about this city.", fun=True)
card(P, 2, "Lucky numbers", "Ask a stranger to pick your lucky numbers for the week.", fun=True)
card(P, 3, "What's playing?", "Ask someone with headphones what they're listening to, and if you can hear ten seconds.", fun=True)
card(P, 4, "Tour guide", "Narrate the next stop like a tour guide to the person next to you.", fun=True)
card(P, 3, "Two stops", "Each of you starts a chat with a stranger before the next stop.", duo=True)
card(P, 3, "Fact hunt", "Each of you collects a fun fact from a stranger. Best fact wins.", duo=True, fun=True)
card(P, 2, "Free seat", "Ask someone you find attractive if the seat next to them is free, then sit.", flirt=True)
card(P, 3, "Good playlist?", "Ask someone you find attractive what they're listening to.", flirt=True)
card(P, 5, "Before my stop", "Before your stop, tell someone you've chatted with that it was nice, and ask for their Instagram.", flirt=True)

# ---- party / bar ----------------------------------------------------------------------------
P = "party"
card(P, 2, "First ten minutes", "Introduce yourself to someone you don't know within 10 minutes.")
card(P, 2, "The host", "Ask the host to introduce you to someone.")
card(P, 3, "The circle", "Join a group that's already talking.")
card(P, 3, "Five names", "Learn and use the names of five new people tonight.")
card(P, 3, "Matchmaker", "Introduce two people who don't know each other.")
card(P, 3, "DJ, please", "Ask the DJ to play your song.")
card(P, 4, "A toast", "Raise your glass and give a short toast to the group.")
card(P, 4, "Group chat", "Get three new people's numbers to make a group for the next plan.")
card(P, 5, "The mic", "Get the mic and say something to the whole room.")
card(P, 3, "Two truths", "Play two truths and a lie with someone you just met.", fun=True)
card(P, 3, "Teach me a move", "Ask someone to teach you a dance move, then do it.", fun=True)
card(P, 3, "Palm reading", "Ask someone if you can read their palm, and give them an absurd but kind future.", fun=True)
card(P, 4, "Dance-off", "Challenge someone to a dance-off.", fun=True)
card(P, 3, "Wingman", "Your friend introduces you to a stranger, then you do the same for them.", duo=True)
card(P, 4, "Split and swap", "Split up: each of you introduces yourself to someone new, then you introduce your new people to each other.", duo=True)
card(P, 3, "First on the floor", "Be the first two dancing.", duo=True, fun=True)
card(P, 3, "Hi, I'm…", "Introduce yourself to someone you find attractive and ask their name.", flirt=True)
card(P, 4, "Dance?", "Ask someone you find attractive to dance.", flirt=True)
card(P, 4, "The number", "After a good chat, ask for their number.", "Wrap up first: \"I have to go, I liked talking to you. Can I get your number?\"", flirt=True)
card(P, 4, "Double intro", "Each of you introduces yourself to someone you find attractive.", duo=True, flirt=True)
card(P, 4, "Dance battle", "Challenge someone you find attractive to a dance-off.", flirt=True, fun=True)

# ---- gym ------------------------------------------------------------------------------------
P = "gym"
card(P, 1, "Is it free?", "Ask if a machine or bench is free.")
card(P, 1, "Share the machine", "Ask to share a machine between sets.")
card(P, 2, "Show me", "Ask someone how a machine works.")
card(P, 2, "Good form", "Compliment someone's technique or progress.")
card(P, 2, "Spot me", "Ask someone to spot you on a set.")
card(P, 3, "Their program", "Ask someone who looks experienced what their program is.")
card(P, 3, "Form check", "Ask a stranger to watch one set and correct your form.")
card(P, 3, "Guest pass", "Ask the front desk for a free day pass for a friend.")
card(P, 4, "Train together", "Ask someone to do a workout together next time.")
card(P, 5, "Lead the warm-up", "Ask the instructor if you can lead the warm-up of the class.")
card(P, 2, "Count my reps", "Ask someone to count your reps out loud.", fun=True)
card(P, 2, "Gym DJ", "Ask the staff to put your song on.", fun=True)
card(P, 3, "Hype man", "Ask a stranger to cheer you through your last set.", fun=True)
card(P, 4, "Arm wrestling", "Challenge someone to an arm-wrestling match.", fun=True)
card(P, 4, "Partner set", "Each of you asks a stranger to join you for one set.", duo=True)
card(P, 3, "Cheer squad", "Ask a stranger if you two can cheer their last rep, then do it loudly.", duo=True, fun=True)
card(P, 2, "Quick tip", "Ask someone you find attractive for a tip on an exercise.", flirt=True)
card(P, 3, "Spot, please", "Ask someone you find attractive to spot you.", flirt=True)
card(P, 5, "Smoothie after?", "Ask someone you find attractive if they want a smoothie after the workout.", flirt=True)

# ---- home / phone ---------------------------------------------------------------------------
P = "home"
card(P, 1, "Old friend", "Message a friend you haven't talked to in six months.")
card(P, 2, "The call", "Call someone you'd usually just text.")
card(P, 2, "Voice note", "Send a voice message instead of a text.")
card(P, 2, "Neighbour", "Introduce yourself to a neighbour you've never talked to.")
card(P, 3, "The plan", "Propose a concrete plan to someone: day, time, place.")
card(P, 3, "A cup of sugar", "Knock at a neighbour's door to borrow something.")
card(P, 3, "Better deal", "Call your phone or internet provider and ask for a better price.")
card(P, 3, "Cold email", "Email someone you admire with one precise question.")
card(P, 4, "Honest feedback", "Ask a friend for one honest piece of feedback about you.")
card(P, 4, "Fifteen minutes", "Ask someone doing a job you'd like for a 15-minute call.")
card(P, 4, "Long shot", "Apply for something you feel under-qualified for.")
card(P, 5, "Ask for more", "Ask for a raise, a better grade or better terms, with your arguments ready.")
card(P, 1, "Absurd poll", "Send your group chat a poll on a ridiculous question, and defend your vote.", fun=True)
card(P, 2, "Pizza art", "Order a pizza and ask for a smiley made of toppings.", fun=True)
card(P, 2, "Thank-you call", "Call a company's customer service only to thank them for something.", fun=True)
card(P, 3, "Random birthday", "Call a friend and sing them a song on a random day. Full song.", fun=True)
card(P, 3, "Call night", "Same evening, each of you calls someone you haven't spoken to in a year.", duo=True)
card(P, 2, "Real reply", "Reply to a story of someone you like with a real comment or question.", flirt=True)
card(P, 3, "Voice, not text", "Send a voice note to someone you like.", flirt=True)
card(P, 4, "Ask by text", "Ask someone you like out by message, with a day and a place.", flirt=True)

# ---- duo + flirt ----------------------------------------------------------------------------
card("cafe", 3, "Wingman", "Your friend starts a chat with someone you find attractive, then introduces you. Swap next time.", duo=True, flirt=True)
card("street", 4, "Two approaches", "Each of you says hi to someone you find attractive. The other one watches and debriefs.", duo=True, flirt=True)
card("party", 3, "Settle our debate", "Together, ask someone you find attractive to settle a silly debate between you two.", duo=True, flirt=True, fun=True)
card("cafe", 3, "Rate our order", "Together, ask someone you find attractive which of your two drinks looks better.", duo=True, flirt=True, fun=True)

# ---- more fun (absurd, harmless) ------------------------------------------------------------
card("street", 2, "Grandma's recipe", "Ask a stranger for the best recipe their family makes.", fun=True)
card("street", 3, "Name my bag", "Ask a stranger to give your bag a name. Introduce the bag to the next person you talk to.", fun=True)
card("street", 3, "Autograph, in advance", "Ask a stranger for their autograph, for when they're famous.", fun=True)
card("street", 3, "Guess the song", "Hum a song and ask a stranger to guess it.", fun=True)
card("street", 3, "Award ceremony", "Give a stranger an award (best coat of the day) with a ten-second speech.", fun=True)
card("street", 4, "Thumb war", "Challenge a stranger to a thumb war.", fun=True)
card("street", 4, "Imaginary dog", "Ask a stranger if they want to pet your imaginary dog. Describe the dog.", fun=True)
card("street", 5, "Air guitar", "Play a ten-second air guitar solo and ask a stranger to rate it.", fun=True)
card("cafe", 2, "Napkin fortune", "Write a fortune on a napkin and give it to the barista.", fun=True)
card("cafe", 3, "Tasting notes", "Describe your coffee to the barista like a wine expert, then ask if they agree.", fun=True)
card("cafe", 4, "Cheers", "Ask the next table to raise their cups with you, for no reason at all.", fun=True)
card("shop", 2, "Five-euro dinner", "Ask the greengrocer or butcher what you should cook tonight with five euros.", fun=True)
card("shop", 3, "One banana", "Negotiate the price of a single banana, seriously.", fun=True)
card("shop", 4, "Photoshoot", "In a changing room queue, ask staff to direct you like a fashion shoot for one photo.", fun=True)
card("transport", 3, "Guess my name", "Ask the person next to you to guess your name. Give hints.", fun=True)
card("transport", 4, "Thirty-second portrait", "Ask a stranger to draw you in 30 seconds in your notebook.", fun=True)
card("transport", 5, "Good morning, everyone", "Say \"Good morning everyone, have a great day\" to the whole carriage.", fun=True)
card("party", 3, "Pass it on", "Compliment someone and ask them to pass a compliment on to someone else.", fun=True)
card("party", 3, "Red carpet", "Interview a guest as if they were a celebrity on a red carpet.", fun=True)
card("party", 5, "Conga", "Start a conga line. Recruit at least three people.", fun=True)
card("gym", 3, "Victory pose", "Ask someone to take a photo of your victory pose after your last set.", fun=True)
card("gym", 3, "Pep talk", "Ask a stranger for a ten-second motivational speech before your set.", fun=True)
card("class", 2, "Riddle", "Ask the person next to you a riddle. They have until the end of class.", fun=True)
card("class", 3, "Better title", "After class, pitch the lecturer a funnier title for the course.", fun=True)
card("library", 3, "Shoe-based advice", "Ask a stranger to recommend you a book based only on your shoes.", fun=True)
card("home", 2, "Product idea", "Email a brand you like with a product idea for them.", fun=True)
card("home", 3, "Compliment call", "Call a friend just to give them three specific compliments, then hang up.", fun=True)

# ---- harder progress ------------------------------------------------------------------------
card("street", 4, "Walk me there", "Ask someone for directions, then ask if they'd walk you there.")
card("street", 5, "Lunch, now", "Ask a stranger to have lunch with you, now.", "Say why: you're practising meeting people. Pay for yourself, not for them.")
card("cafe", 4, "Yesterday's pastry", "Ask if you can have one of yesterday's pastries for free.")
card("cafe", 5, "Meet the owner", "Ask to speak to the owner and ask them one question about running the place.")
card("shop", 4, "Expired coupon", "Ask to use an expired coupon or last week's promotion.")
card("shop", 5, "Try it at home", "Ask if you can borrow an item for a day before deciding to buy it.")
card("class", 3, "Speak first", "In a group meeting, speak first and propose a plan.")
card("transport", 5, "Your seat?", "Ask someone to give you their seat, with no reason. Accept the no, and thank them.")
card("party", 4, "Leave with a plan", "Before leaving, set a concrete plan with someone you met tonight.")
card("gym", 4, "Ten free minutes", "Ask a coach for a free ten-minute session.")
card("library", 3, "Poster", "Ask the library if you can put up a poster for your study group.")
card("home", 5, "Give a talk", "Ask an event organiser if you can give a five-minute talk at their next event.")

import re, unicodedata
def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+","-", s.lower()).strip("-")
def q(v):
    if v is None: return "null"
    if isinstance(v,bool): return "true" if v else "false"
    if isinstance(v,int): return str(v)
    return "'" + str(v).replace("'","''") + "'"

rows = []
for day,t,b,d,tip in STORY:
    rows.append(dict(id=f"d{day}",mode="story",title=t,body=b,difficulty=d,tip=tip,place=None,duo=False,tone="serious",crush=day>=15 and day!=29,day=day,week=min(4,(day-1)//7+1) if day<=28 else 5,checkpoint=day in CHECKPOINTS))
for w,t,b,d in SUNDAY:
    rows.append(dict(id=f"sun{w}",mode="sunday",title=t,body=b,difficulty=d,tip=None,place=None,duo=False,tone="serious",crush=w>=3,day=None,week=w,checkpoint=False))
seen=set()
for place,t,b,d,duo,tone,crush,tip in SITUATION:
    cid = f"s-{place}-{slug(t)}"
    assert cid not in seen, cid; seen.add(cid)
    rows.append(dict(id=cid,mode="situation",title=t,body=b,difficulty=d,tip=tip,place=place,duo=duo,tone=tone,crush=crush,day=None,week=None,checkpoint=False))

for r_ in rows: r_["active"] = True
cols=["id","mode","title","body","tip","difficulty","place","duo","tone","crush","day","week","checkpoint","active"]
values=",\n".join("  ("+", ".join(q(r[c]) for c in cols)+")" for r in rows)
seed = f"""insert into public.cards ({", ".join(cols)}) values
{values}
on conflict (id) do update set
  mode = excluded.mode, title = excluded.title, body = excluded.body, tip = excluded.tip,
  difficulty = excluded.difficulty, place = excluded.place, duo = excluded.duo, tone = excluded.tone,
  crush = excluded.crush, day = excluded.day, week = excluded.week, checkpoint = excluded.checkpoint,
  active = true, updated_at = now();

update public.cards set active = false, updated_at = now()
where mode = 'situation' and id not in ({', '.join(q(r['id']) for r in rows if r['mode'] == 'situation')});
"""
open("supabase/cards_seed.sql","w",encoding="utf-8").write("-- Generated by tools/cards.py. Upserts all cards, deactivates side quests no longer listed.\n-- Re-running overwrites admin edits made on the same ids.\n"+seed)
print(len(rows),"cards:", sum(r['mode']=='story' for r in rows),"story,", sum(r['mode']=='sunday' for r in rows),"sunday,", sum(r['mode']=='situation' for r in rows),"situation")

# JSON copy for local tests / previews (not used by the site)
import json
json.dump(rows, open("tools/cards.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
