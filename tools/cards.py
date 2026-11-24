# Card catalogue -> supabase/007_cards.sql
# Edit the lists below, then run: python tools/cards.py  (regenerates the seed SQL)
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

# (place, title, body, difficulty, duo, tone, crush)
SITUATION = [
 ("class","Out loud","Ask a question out loud during class.",2,False,"serious",False),
 ("class","Notes","Ask the person next to you if you can look at their notes.",1,False,"serious",False),
 ("class","After class","Go ask the lecturer one question after class.",2,False,"serious",False),
 ("class","Study group","Propose to two classmates to work together this week.",3,False,"serious",False),
 ("class","New faces","At the break, each of you introduces yourself to a classmate you've never talked to.",3,True,"serious",False),
 ("library","Charger","Ask someone if they can lend you a charger.",1,False,"serious",False),
 ("library","Guard my stuff","Ask someone to watch your things while you get a coffee.",2,False,"serious",False),
 ("library","What's that?","Ask someone what they're reading and whether it's good.",3,False,"serious",False),
 ("library","Coffee break","Ask someone studying nearby to take a coffee break with you.",4,False,"serious",False),
 ("cafe","Barista's choice","Order \"whatever you'd drink\".",1,False,"serious",False),
 ("cafe","Shared table","When it's busy, ask to share a table.",2,False,"serious",False),
 ("cafe","Worth it?","Ask the person next to you what they ordered and if it's good.",2,False,"serious",False),
 ("cafe","Join in","Together, ask a group if you can join their game or quiz table.",4,True,"serious",False),
 ("street","The dog","Ask someone if you can pet their dog.",1,False,"serious",False),
 ("street","Local tip","Ask someone for the best place to eat nearby.",1,False,"serious",False),
 ("street","Photo swap","Offer to take a photo for a group, then ask them to take yours.",2,False,"serious",False),
 ("street","Bench talk","Sit near someone on a bench and start a conversation.",4,False,"serious",False),
 ("shop","Wrong shop","Ask for something the shop obviously doesn't sell.",2,False,"serious",False),
 ("shop","Honest opinion","Try something on and ask a stranger what they think.",3,False,"serious",False),
 ("shop","Price check","Ask for a discount at the till.",2,False,"serious",False),
 ("shop","Opinion poll","Pick one item together; each of you asks a different stranger's opinion on it, then compare.",2,True,"serious",False),
 ("transport","Which stop?","Ask someone which stop is best for a place.",1,False,"serious",False),
 ("transport","Thanks, driver","Thank the driver out loud when you get off.",1,False,"serious",False),
 ("transport","Seat swap","Ask someone to swap seats with you.",2,False,"serious",False),
 ("transport","Small talk","Comment on something around you to the person next to you.",3,False,"serious",False),
 ("party","First ten minutes","Introduce yourself to someone you don't know within 10 minutes.",2,False,"serious",False),
 ("party","The host","Ask the host to introduce you to someone.",2,False,"serious",False),
 ("party","The circle","Join a group that's already talking.",3,False,"serious",False),
 ("party","Split and swap","Split up: each of you introduces yourself to someone new, then you introduce your new people to each other.",4,True,"serious",False),
 ("gym","Show me","Ask someone how a machine works.",2,False,"serious",False),
 ("gym","Share the machine","Ask to share a machine between sets.",2,False,"serious",False),
 ("gym","Good form","Compliment someone's technique or progress.",2,False,"serious",False),
 ("home","Old friend","Message a friend you haven't talked to in six months.",1,False,"serious",False),
 ("home","The call","Call someone you'd usually just text.",2,False,"serious",False),
 ("home","Voice note","Send a voice message instead of a text.",2,False,"serious",False),
 ("home","The plan","Propose a concrete plan to someone: day, time, place.",3,False,"serious",False),
 ("home","Honest feedback","Ask a friend for one honest piece of feedback about you.",4,False,"serious",False),
 # Fun
 ("street","High five","Get a high five from a stranger.",2,True,"fun",False),
 ("street","Quick poll","Ask five strangers the same silly question (best pizza topping?) and tally the answers.",2,True,"fun",False),
 ("street","Rock, paper, scissors","Challenge a stranger to one round.",3,False,"fun",False),
 ("street","Count to ten","Ask someone to count to ten in their language.",2,False,"fun",False),
 ("street","Squad photo","Ask a group of strangers to jump into your photo.",3,True,"fun",False),
 ("cafe","Bad joke","Tell the barista or cashier a (clean) bad joke.",2,False,"fun",False),
 ("cafe","DJ request","Ask the bar or café to play a specific song.",2,False,"fun",False),
 ("shop","Style check","Each of you tries on the worst item you can find and asks a stranger if it suits you.",2,True,"fun",False),
 ("shop","Never buy","Ask the baker which pastry they'd never pick, and why.",1,False,"fun",False),
 ("gym","Count my reps","Ask someone to count your reps out loud.",2,False,"fun",False),
 ("party","First on the floor","Be the first two dancing.",3,True,"fun",False),
 # Crush
 ("cafe","The smile","Smile at someone you find attractive and say hi as you pass.",2,False,"serious",True),
 ("shop","Second opinion","Ask someone you find attractive which of two items they'd pick.",2,False,"serious",True),
 ("street","Style compliment","Compliment the style of someone you find attractive, then keep walking.",3,False,"serious",True),
 ("class","Compare notes","After class, ask someone you find attractive to compare notes.",3,False,"serious",True),
 ("party","Hi, I'm…","Introduce yourself to someone you find attractive and ask their name.",3,False,"serious",True),
 ("library","Study break","Ask someone you find attractive what they're studying, then if they want a coffee break.",4,False,"serious",True),
 ("party","Double intro","Each of you introduces yourself to someone you find attractive.",4,True,"serious",True),
]

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
for place,t,b,d,duo,tone,crush in SITUATION:
    cid = f"s-{place}-{slug(t)}"
    assert cid not in seen, cid; seen.add(cid)
    rows.append(dict(id=cid,mode="situation",title=t,body=b,difficulty=d,tip=None,place=place,duo=duo,tone=tone,crush=crush,day=None,week=None,checkpoint=False))

cols=["id","mode","title","body","tip","difficulty","place","duo","tone","crush","day","week","checkpoint"]
values=",\n".join("  ("+", ".join(q(r[c]) for c in cols)+")" for r in rows)
seed = f"""insert into public.cards ({", ".join(cols)}) values
{values}
on conflict (id) do update set
  mode = excluded.mode, title = excluded.title, body = excluded.body, tip = excluded.tip,
  difficulty = excluded.difficulty, place = excluded.place, duo = excluded.duo, tone = excluded.tone,
  crush = excluded.crush, day = excluded.day, week = excluded.week, checkpoint = excluded.checkpoint,
  updated_at = now();
"""
open("supabase/cards_seed.sql","w",encoding="utf-8").write("-- Generated by tools/cards.py. Safe to re-run (upsert).\n"+seed)
print(len(rows),"cards:", sum(r['mode']=='story' for r in rows),"story,", sum(r['mode']=='sunday' for r in rows),"sunday,", sum(r['mode']=='situation' for r in rows),"situation")

# JSON copy for local tests / previews (not used by the site)
import json
json.dump(rows, open("tools/cards.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
