# Narrative design toolkit for a branching, grey-morality, mystical detective game (Gogol × King × Lynch, Poltava 1811)

Scope note: these are research notes for a report writer. Every claim in the "Cited Findings" sections has an inline source. Inferences, which apply the findings to the project (8-case season, census-of-souls ledger as the save file, "unclean force or people?" as the core question), are kept apart from the cited facts. Research date: 2026-10-23.

---

## 1. Branching structures that stay affordable (branch-and-bottleneck, hub-and-spoke, delayed consequences, qualities/storylets, how named games handle remembered choices, how many endings)

### Takeaway
The affordable shape is a **branch-and-bottleneck / hub-and-spoke spine with heavy state tracking.** Modular **storylets gated by qualities** layer on top of it, and consequences are made **visible and delayed** so they feel heavy. Content does not explode, because scenes rejoin and later text changes through variables (flavour, callbacks, who is alive or hostile) instead of forking whole plots. Weight comes from showing the player that the game noticed, not from the number of forks.

### Cited Findings
**Structural patterns (vocabulary for the bible)**
- Sam Kabo Ashwell's taxonomy, "Standard Patterns in Choice-Based Games," names the patterns Time Cave, Gauntlet, Branch and Bottleneck, Quest, Open Map, Sorting Hat, Floating Modules, Loop and Grow and Spoke and Hub. The Time Cave branches heavily, rarely re-merges and has many endings, so "most players miss much of the content." — [Ashwell, Standard Patterns](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)
- Branch and Bottleneck: branches regularly rejoin at events common to all versions of the story. "branch-and-bottleneck structures almost always rely on heavy use of state-tracking… if a game doesn't do this, chances are you are dealing with a gauntlet." It suits character growth, because playthroughs diverge gradually as choices accumulate, but it needs a fairly large work before the change shows. Dan Fabulich of Choice of Games calls it "delayed branching." — [Ashwell](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)
- Spoke and Hub (a variant of Loop and Grow): "several major branches, but they all originate at and return to a central node or set of nodes." Loop and Grow needs an in-world reason for the repetition (routine, time travel), and it often carries "a struggle against confinement or stagnation." — [Ashwell](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)
- Quest structure (used by Fighting Fantasy, Lone Wolf and 80 Days): modular, geography-organised node clusters that rejoin toward a small number of endings. Quests "do poorly when they don't" track state. The risk is a fragmentary narrative in which episodes don't matter to the big picture. — [Ashwell](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)
- Floating Modules / QBN: "No central plot, no through-line." Content becomes available based on state or randomness. It is hard to write for, and without a lot of content it collapses toward linearity. — [Ashwell](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/)

**Quality-based / salience-based / waypoint narrative (Emily Short, Failbetter)**
- Quality-based narrative (QBN) is Failbetter's term for "interactive narratives structured around storylets unlocked by qualities." Qualities are numeric variables for inventory, skills and story progress. Failbetter itself later stopped using the name. — [Emily Short, Beyond Branching (2016)](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- Short's cost example: a mystery with three clues findable in any order needs many duplicated paths in plain branching, but only **four storylets (one gated)** in QBN. — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- QBN strengths: modular content can be added beside old content with little risk of breaking it, which suits episodic work, and later stories can add callbacks to earlier content. Weaknesses: the list of available storylets "gets overwhelming for the player" at scale, and authors must track story spines by hand ("a lot of bookkeeping"). — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- Salience-based narrative (Short's coinage) means the *system* picks the most applicable content from a pool, as in Elan Ruskin's Left 4 Dead dialogue system, later used in Firewatch. It lets you write broad defaults first and add specific variants later. The risk is beats less effective than hand-placed ones. Short suggests weighting variables by dramatic arc, and **testing by running thousands of randomized playthroughs and visualizing them**. — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- Waypoint narrative (Glass): topics are nodes, some "trigger topics" advance the plot, and "the story engine is constantly trying to heal the story." The trade-off is that story progression rests on the NPCs rather than the player. — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- On tuning numbers, Short suggests a few constants for "a little / a medium amount / a lot," adjusted through random testing. — [Beyond Branching (author comment)](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- Storylets are "simple, atomic, robust, and recombinable," each with **content, prerequisites and effects** on world state. They can rebuild gauntlets, branch-and-bottleneck, sorting hats and loop-and-grow by using a **progress quality** plus an optional **"menace" stat**. Short recommends prototyping on index cards. Time caves are "possibly the most annoying type of work to build with storylets," so embed small time-cave bits inside a storylet frame. Storylet systems are "a good bet for a game that's meant to last for years" or to take DLC. — [Emily Short, Storylets: You Want Them (2019)](https://emshort.blog/2019/11/29/storylets-you-want-them/)
- Fallen London (running since 2009) is the flagship QBN game. StoryNexus was Failbetter's public QBN authoring tool. — [Emily Short, StoryNexus is Open](https://emshort.blog/2012/10/16/storynexus-is-open/); [Wikipedia: Fallen London](https://en.wikipedia.org/wiki/Fallen_London)

**inkle: 80 Days, Sorcery!, Heaven's Vault and making choices feel like they matter**
- Jon Ingold framed the core branching problem as "convincing you that the choices they make you agonize over have any impact on the game at all." In inkle's Frankenstein app, players felt choices didn't matter even though a hidden system tracked them, because there was "no UI to show you that." — [IF50: 80 Days](https://if50.substack.com/p/2014-80-days)
- inkle's fixes: **make structure visible** (Sorcery! and 80 Days frame choices on a map that shows progress, missed branches and cause and effect), **show stats** that rise and fall, **use frequent small choices** for pacing, **build trade-offs** between money, time and wellbeing (a visible clock that runs in cities), and **track state automatically** (ink records visited nodes, so later text varies). — [IF50: 80 Days](https://if50.substack.com/p/2014-80-days)
- 80 Days containment: eastward-only travel avoids choke points, each city stop is largely self-contained, and recurring characters link the world. It is "worldbuilding instead of plot." **Most journeys reveal under 10% of the text.** Scale: over 700,000 words, 150 cities, 16,000 choices and 400+ connections. — [IF50: 80 Days](https://if50.substack.com/p/2014-80-days)
- Heaven's Vault: plot comes in small pieces, and moon incidents "can occur in almost any order." Translation guesses "ripple outward into personal interactions." Emily Short found that choices *framed* as high-stakes often had little effect, while unsignaled actions shaped later events, and she wished for cues like **"Six will remember that."** — [Emily Short, Heaven's Vault review](https://emshort.blog/2019/07/23/heavens-vault-inkle/)
- Heaven's Vault never confirms whether your translations are correct. — [PCWorld](https://www.pcworld.com/article/406127/inkles-space-archaeologist-adventure-wont-tell-you-if-your-lost-language-translations-are-wrong.html)

**CD Projekt Red (Witcher 3 / Cyberpunk 2077), GDC 2023 lessons from Paweł Sasko**
- "Make choices into dilemmas": set up the stakes before a key choice, and offer options that match what players naturally want to do. **Delayed consequences**, where early choices return at unexpected moments, "make[s] the biggest impression." **"Design for the visibility of consequences"**: investment in consequences players can't see is mostly wasted. Also: "A game is not a life simulation, it is entertainment" (avoid overdesign). — [Game Developer: 10 takeaways from Sasko's quest design talk](https://www.gamedeveloper.com/marketing/10-key-takeaways-from-the-quest-design-of-cyberpunk-2077-and-the-witcher-3)
- CDPR writer Jakub Szamałek said they gave consequences even to small side quests, for example *refusing* a quest has effects later. — [GameBanshee video interview](https://gamebanshee.com/x8fx)

**Mass Effect: cross-game state**
- Casey Hudson (pre-release): "We're pulling in probably over a thousand variables from Mass Effect 2 into Mass Effect 3." Commentators note many of those variables are minor (one dialogue option changing a small detail). — [GameBanshee](https://gamebanshee.com/kw8f6); [RPG Site trilogy choices guide](https://www.rpgsite.net/feature/11112-mass-effect-choices-consequences-decisions-that-matter-across-the-trilogy)
- From ME1 to ME2, many things did not map 1:1 because the systems changed. Paragon/Renegade scores carried over as a rough summary of how you played. — [Shacknews](https://www.shacknews.com/article/61759/mass-effect-2-details-about)

**Endings counts (benchmarks)**
- Papers, Please: a scripted story mode with **20 endings**, plus endless modes. — [Wikipedia](https://en.wikipedia.org/wiki/Papers,_Please)
- The Bloody Baron's final branch (free or kill the Whispering Hillock) has **two main outcome clusters**, each with a cost: freeing it leads to Anna dying and the Baron hanging himself; killing it leaves the orphans taken by the Crones and Anna mad. — [Wikipedia: The Bloody Baron](https://en.wikipedia.org/wiki/The_Bloody_Baron)
- Pentiment never confirms a culprit (see §2 and §3).

### Inferences
- **Recommended season spine:** use Spoke-and-Hub in which the hub is the census office or Mirgorod, and each case is a spoke. Inside each case, use branch-and-bottleneck. Each case should end in a bottleneck, "you sign the entry for this soul," with 2–4 verdict states. The season should then compute 3–5 finales from accumulated qualities rather than from a branching tree. This follows Ashwell's patterns and Short's storylet advice.
- **The census ledger works naturally as QBN qualities.** Each "soul" entry can be a quality (status: alive / dead / fled / "struck out" / "listed as dead but walks"), plus a few meta-qualities: *Suspicion of the Unclean*, *Standing with the Treasury*, *Village Trust*, *Conscience* (a "menace"-style stat). Later cases gate storylets on these, which is the "four storylets instead of a tree" economy.
- **Make the ledger the visible UI of consequence.** This answers Ingold's Frankenstein lesson and Sasko's "visibility" rule. Signing must visibly change ink on the page, and later cases should reread the signature ("you wrote her as dead in March").
- **Delayed callbacks are cheap, re-plotting is expensive.** Budget roughly one "return of an earlier choice" scene per case (Sasko). Most carry-over should be text variation and NPC attitude (the Mass Effect lesson: hundreds of tiny variables, few big forks).
- **Signpost lightly.** A "Panko will remember that" or ledger-margin note answers Emily Short's Heaven's Vault critique without telling the player whether the choice was right.
- **Pitfalls:** the Time Cave cost; a QBN list that overwhelms the player (cap the visible storylets per location); invisible consequences; Sorting-Hat linear second halves, if the season forks hard at case 4.

### Gaps
- I did not retrieve inkle's own blog posts, only the IF50 retelling of Ingold's talk. The exact 80 Days word count varies by source (IF50 says 700,000+).
- I found no primary Failbetter blog post by Alexis Kennedy in this pass, only Emily Short's summaries.
- Sasko's GDC 2017 Bloody Baron talk: Wikipedia says GDC 2017, while Destructoid covered a Digital Dragons talk. The venue and year conflict across sources ([Wikipedia](https://en.wikipedia.org/wiki/The_Bloody_Baron) vs [Destructoid](https://www.destructoid.com/cd-projekt-red-designer-breaks-down-the-witcher-3s-best-quest/)).
- No reliable source was found for the commonly quoted "36 endings" of The Witcher 3, so it was not used.

---

## 2. Grey-morality craft: dilemmas where every option costs something, understandable antagonists, avoiding preachiness

### Takeaway
Proven grey-morality design uses four tools. (1) Every option takes something from a resource the player cares about: a person, the family, money, trust, conscience. (2) The sympathetic side of a monster is revealed *before* the monstrous side (Bloody Baron). (3) Escalation comes in small reasonable steps (Frostpunk's boiled frog). (4) The game refuses to certify the answer (Pentiment). Preachiness is avoided by making the player *do* the thing rather than be told, and by always leaving a "clean" but costly path.

### Cited Findings
**The Witcher 3, "Family Matters" / Bloody Baron**
- It began as one sentence: a Baron wants a witcher to kill a monster in exchange for information about Ciri. The Baron is a foil to Geralt, since both search for family. The team **gave him charm and humour first and revealed the domestic abuse only after he had sheltered Ciri**, to make players conflicted. Designer Paweł Sasko drew on childhood memories of alcoholism and domestic violence in a poor mountain village. Both creators (Sasko as designer, Karolina Stachyra as writer) wanted to show no one is purely good or evil. Sasko noted most players forgave the Baron, which he took as proof the design worked. — [Wikipedia: The Bloody Baron](https://en.wikipedia.org/wiki/The_Bloody_Baron)
- The final choice (free or kill the Whispering Hillock) has costs on both sides: hanged Baron and dead Anna, versus orphans taken by the Crones, a mad Anna, and soldiers growing more brutal in the Baron's absence. — [Wikipedia](https://en.wikipedia.org/wiki/The_Bloody_Baron)
- Pacing: Sasko maps quests on a tension-over-time graph, saying "the most important parts in the story are when the tension is the lowest and when the tension is the highest." The graph is colour-coded (blue = non-interactive story, red = combat, green = non-combat interactivity). Too many blue scenes in a row feel slow, and gameplay without story reminders makes players forget what it's about. The botchling burial is the release ("a lot of people cry at that moment"). He accepts clichés only when used self-consciously and checks emotional beats by watching YouTubers play. — [Destructoid on Sasko's talk](https://www.destructoid.com/cd-projekt-red-designer-breaks-down-the-witcher-3s-best-quest/)
- Sasko says the Bloody Baron line is the quest he is proudest of. — [GamePressure interview](https://www.gamepressure.com/editorials/interview-with-cd-projekt-reds-lead-quest-designer-pawel-sasko/zd661)

**Pentiment (Obsidian, Josh Sawyer)**
- Sawyer: "logic-based 'one true solution' murder mystery games [are] not very satisfying personally." The design aims to keep players from thinking "I definitely think this person did it." He argues that naming the killer would make the punishment "the mechanism of the state in action" and remove the player's sense of responsibility. He calls justice under uncertainty "hollow," says a clean definitive ending is "nice" but not fulfilling in this setting, and notes the Archdeacon is "biased," so some convictions are easier than others. — [Game Developer: Making Pentiment's most macabre murder mysteries](https://www.gamedeveloper.com/design/making-pentiment-s-most-macabre-murder-mysteries)
- "For it to be compelling the way he wanted, there could be no single right answer." Some suspects seem likelier in hindsight, "but that does not mean they did it." — [Shacknews, relaying PC Gamer](https://www.shacknews.com/article/146276/pentiment-josh-sawyer-no-correct-answer)
- The accused will likely be killed, so the player must own the accusation. — [TheGamer](https://www.thegamer.com/pentiment-historical-murder-mystery-obsidian/)
- Time pressure: you must accuse within a few days, which are structured by meals and sleep. — [PC Gamer review](https://pcgamer.com/pentiment-review); [Adventure Gamers](https://adventuregamers.com/games/view/48972)

**Papers, Please (Lucas Pope)**
- Pope: "the rigid structure of an oppressive bureaucracy works really well with how I like to design game mechanics." He added lighter encounters "for levity," generalised the politics "to not just be about one situation or regime," aimed for situations "where it's not always a simple good/evil dynamic," and advised: **"Don't tell or show something when you can make the player do it themselves instead."** — [Reason interview (2013)](https://reason.com/2013/09/26/papers-please-politics-in-games-and-the/)
- Correct work pays and mistakes are docked from wages. Each night you decide who in your family goes hungry or untreated (a sick son needs medicine). — [GamePressure: moral choices with 11 bit devs](https://www.gamepressure.com/editorials/fifth-dont-kill-on-moral-dilemmas-in-video-games/a-shard-of-ice-instead-of-a-heart/zf4b9)

**Frostpunk / This War of Mine (11 bit studios)**
- Escalation by small steps: Frostpunk's Book of Laws starts with common-sense rules (child labour in safe jobs, extended shifts) and unlocks harsher ones as things worsen. "enough small, tenuous steps take us, as a society, to a very bad place." Harsh laws even *raise* the hope metric. The developers admit that switching off empathy makes both games easier: "morality is the greatest difficulty." There is always a path that doesn't require atrocity: "It is possible to complete the game without resorting to murder or authoritarian laws." The author reflects, "I can still fully rationalize to myself the string of decisions I made." — [GamePressure, with Jakub Stokalski](https://www.gamepressure.com/editorials/fifth-dont-kill-on-moral-dilemmas-in-video-games/a-shard-of-ice-instead-of-a-heart/zf4b9)
- Paweł Miechowski (This War of Mine) argues games suit moral questions because they do not force you into a moral position. — [PCGamesN](https://pcgamesn.com/this-war-of-mine/the-uneasy-brilliance-of-this-war-of-mine)
- An academic production study interviewed 11 bit team members about how moral gameplay was designed. — [de Smale, Kors & Sandovar, Games and Culture (Utrecht portal)](https://research-portal.uu.nl/en/publications/the-case-of-this-war-of-mine-a-production-studies-perspective-on-/)

**Pathologic 2 (Ice-Pick Lodge)**
- Narrative designer Alexandra Golubeva describes the studio's interest in "suboptimal" stories: the game doesn't reward perfect play, and tragedy is built in. — [Intel Game Info](https://game.info.intel.com/gaming-access/tragedy-is-inevitable-in-survival-horror-game-pathologic-2)
- Nikolay Dybovsky (older interview): "The root of everything is the player's freedom of choice. The hero's problems should derive from the player's problems." Environments must be directed for decisions to mean anything. — [GameBanshee: Ice-Pick Lodge interview](https://www.gamebanshee.com/k36h4)

**Black Book (Morteshka): the closest Slavic-folklore comparable with a moral ledger**
- The heroine Vasilisa turns to witchcraft to revive her fiancé. A **Sins** counter rises with misdeeds and falls with good deeds, and avoiding sin often means giving up money or experience. The developers reportedly consulted historians and anthropologists on Slavic beliefs and put a folklore codex in the menus. — [AV Club review](https://www.avclub.com/black-book-review); [Cubed3 review](https://cubed3.com/review/6481/1/black-book-pc.html)

### Inferences
- **Bloody Baron recipe for each case's "antagonist":** introduce the human (a kozak, a sotnyk, a witch-widow, a landowner padding his census) as charming or useful *first*, reveal the sin second, and make the final choice trade one innocent for another (a family's fate versus village orphans). Keep both outcomes tragic.
- **Pentiment recipe for verdicts:** in each case the investigator signs a ledger entry that *names a cause*: a person, the unclean force, or "unknown / fled." Gather motive evidence that **rules suspects in, not out**. The authorities (the assessor, the parish priest, the Treasury) should have visible biases that make some verdicts "easier."
- **Papers, Please / Frostpunk recipe for the through-line:** the Treasury's quotas are small reasonable demands ("just round up the souls," "list the runaway as dead") that escalate across 8 cases into complicity with something monstrous (selling dead souls, in a nod to Gogol). Pay the player for compliance, make the honest route cost money or position, and always leave an honest but expensive path.
- **Anti-preachiness:** never have Panko or the game moralise. Let villagers rationalise, as the Frostpunk author did, and let the ledger simply record.
- **Pitfall:** the Black Book-style sin meter, if shown as a single good/evil bar, invites "min-maxing virtue." Prefer several orthogonal qualities (Conscience, Trust, Treasury favour, Unclean attention) so no single number reads as "the score."

### Gaps
- I did not reach a primary Ice-Pick Lodge source specific to Pathologic 2's scarcity design. The Dybovsky quotes are from an older interview.
- No direct developer statement about Kentucky Route Zero's or Disco Elysium's grey morality was gathered in this pass (see §4 for KRZ tone).
- No GDC talk by 11 bit studios on moral design was found.

---

## 3. Detective and deduction mechanics: letting players actually deduce, fair play, red herrings, ambiguous supernatural vs mundane answers

### Takeaway
Players actually deduce when (a) the answer is **constructed** (sentences, slots, fates) rather than picked from three options, (b) **confirmation is batched or partial**, so guessing doesn't pay (Obra Dinn's sets of three, Golden Idol's segment locks), and (c) cases are **chunked into smaller "aha" units** (Ace Attorney). For a game whose core question is "unclean force or people?", the useful precedents are those that deliberately *allow* ambiguous or wrong conclusions: Pentiment, Sherlock Holmes: Chapter One and Heaven's Vault. Knox's fair-play rule #2 bans the supernatural, so the design has to consciously replace it with "both readings must be supported by evidence."

### Cited Findings
**Return of the Obra Dinn (Lucas Pope)**
- Correct fates are confirmed **only in sets of three** (the last six in sets of two) to discourage guesswork. — [Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)
- Pope: the central mechanic is "determining the fate of everyone onboard," done by "filling out a little sentence describing how they died or disappeared" (subject-verb-object). The crew was cut from ~80 to 60, and Pope said the chapter structure needed to organise that many characters was "extremely difficult." — [PC Gamer (2014 preview)](https://www.pcgamer.com/uk/papers-please-creator-lucas-pope-details-his-next-game); [Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn); [Gamereactor](https://www.gamereactor.eu/lucas-pope-found-structure-of-obra-dinn-extremely-difficult/)
- Each confirmed answer constrains the others, so correct answers feed back into the rest (compared to the board game Cryptid). — [Unwinnable](https://unwinnable.com/?p=71958)
- The game accepts multiple correct answers where causes are ambiguous. — [Call to Reason review](https://calltoreason.org/?p=45539)

**The Case of the Golden Idol / The Rise of the Golden Idol (Color Gray Games)**
- The game alternates **Exploring mode** (a frozen scene where clicking people, objects and documents collects keywords for names, places, verbs and items) with **Thinking mode** (filling blanks in an incomplete account of events). Slots fill in segments, and **a segment locks when all its words are correct**. There are 11 cases. It was made in Godot (art in Aseprite) by brothers Ernests and Andrejs Kļaviņš, and the Redux update ported it to Unity. The sequel, The Rise of the Golden Idol (12 Nov 2024), is set in the 1970s. — [Wikipedia](https://en.wikipedia.org/wiki/The_Case_of_the_Golden_Idol)
- The game also tells you when you're close ("one or two" errors). — [Giant Bomb review](https://giantbomb.com/users/4945/articles/indie-game-of-the-week-399-the-case-of-the-golden); note that Wikipedia's wording of the exact threshold is ambiguous.
- At GDC 2023 the team said they noticed few successors to Obra Dinn and identified three problems: **gameplay flow, disjointed narrative, and communicating insights** while solving. They prototyped several versions and kept the one that worked. — [Game Developer: best design talks of GDC](https://www.gamedeveloper.com/design/the-best-design-talks-of-gdc)
- The developers cited Obra Dinn, Her Story and Outer Wilds as inspirations: "games geared towards you making the deductions." After two DLCs they found a "roof of complexity" beyond which puzzles stopped being fun. — [Wikipedia](https://en.wikipedia.org/wiki/The_Case_of_the_Golden_Idol); [Thinky Games feature (403 on fetch, summary via search)](https://thinkygames.com/features/how-the-case-of-the-golden-idol-developers-made-one-of-the-decades-best-detective-games-twice/)

**Ace Attorney (Shu Takumi): contradictions**
- In court you can **Press** a statement (the witness revises testimony) or **Present** evidence against a contradiction. Takumi's first prototype required finding a single contradiction across a whole trial, which he called super difficult, and playtesters felt lost. The shipped version splits trials into smaller chunks so the "Aha!" comes more often, and lets players progress even if some evidence is missed. — [Siliconera](https://www.siliconera.com/the-story-of-how-phoenix-wright-ace-attorney-was-born/); [Nintendo Everything (Famitsu translation)](https://nintendoeverything.com/ace-attorney-creator-on-initial-prototype-and-nearly-suspending-development-maya-and-mias-origins-more/)

**Sherlock Holmes: Chapter One (Frogwares): mind palace**
- You pair clues in the Mind Palace (a wrong pair turns red). Some deductions split into alternatives, and the deduction board can reach different conclusions. Frogwares: you can miss clues or reach the wrong conclusion. Failure "doesn't typically end the game; it changes it." The developer also admits it is hard to allow wrong guesses while still giving every needed clue. — [ProGameGuides](https://progameguides.com/sherlock-holmes-chapter-one/how-the-mind-palace-works-in-sherlock-holmes-chapter-one/); [Epic Games Store feature](https://store.epicgames.com/news/why-sherlock-holmes-is-better-in-video-games-than-books)

**Disco Elysium (ZA/UM): skills as voices, Thought Cabinet**
- There are 24 skills that represent aspects of the protagonist, and checks resolve events. The Thought Cabinet lets players adopt or suppress ideologies, which are internalised over in-game time. — [Wikipedia](https://en.wikipedia.org/wiki/Disco_Elysium)
- Kurvitz: skills "have egos of their own" and want you to listen, and **skills may give bad advice**. — [GameBanshee](https://www.gamebanshee.com/k48wh)
- Mistakes are treated as stepping stones: the game doesn't punish them by cutting players off from content. — [PC Invasion (Canard PC interview)](https://pcinvasion.com/?p=194289)

**Heaven's Vault (inkle): no confirmation**
- The game never tells you if your translations are correct. — [PCWorld](https://www.pcworld.com/article/406127/inkles-space-archaeologist-adventure-wont-tell-you-if-your-lost-language-translations-are-wrong.html)
- The dictionary works "like a crossword": a leap in one area sheds light on others. The critique is that the system sometimes blocked meanings the player found obvious. — [Emily Short](https://emshort.blog/2019/07/23/heavens-vault-inkle/)

**Pentiment: motive, ruling in**
- An alibi system was prototyped and cut: "All it does is exclude [suspects]… we're trying to rule people in, not rule them out." Means matter only for the first murder, and later cases centre on motive. Sawyer builds on Agatha Christie's habit of introducing the victim early along with everyone who disliked them and stood to gain. — [Game Developer](https://www.gamedeveloper.com/design/making-pentiment-s-most-macabre-murder-mysteries); [GameBanshee](https://www.gamebanshee.com/9xdaf)
- Playtest lesson: some plot threads didn't come through, and a character who appears in act 1, fades in act 2, then has a key act-3 moment was a recurring problem. — [Game Developer](https://www.gamedeveloper.com/design/making-pentiment-s-most-macabre-murder-mysteries)

**Other references**
- The Roottrees are Dead: made by Jeremy Johnston for Global Game Jam 2023 and inspired by Obra Dinn and Her Story. Its core is a genealogy reconstructed through an in-game internet search. The 2025 Steam remaster (with Robin Ward) **replaced the jam version's AI art with artist illustrations**, expanded the puzzles and story, and fixed bugs. — [Wikipedia](https://en.wikipedia.org/wiki/The_Roottrees_are_Dead); [itch.io devlog](https://jjohnstongames.itch.io/the-roottrees-are-dead/devlog/632664/the-roottrees-are-finally-dead)
- Shadows of Doubt (ColePowered, full release Sept 2024) uses a case board and a Resolve menu where you pick board items to answer objectives. Its clues are procedurally generated, so there is no fixed walkthrough (per reviewers; exact source among the linked pieces not pinned down). — [Wikipedia](https://en.wikipedia.org/wiki/Shadows_of_Doubt); [Wireframe](https://wireframe.raspberrypi.com/articles/walking-the-voxelated-city-streets-in-shadows-of-doubt-a-fully-simulated); [GameLuster early-access review](https://gameluster.com/early-access-review-shadows-of-doubt-theres-not-been-another-murder-yet/)
- Lorelei and the Laser Eyes (Simogo) has no hint system, because the team wanted players to talk to each other. Simon Flesser's framing: "a puzzle should be structured like a good joke." — [Nintendo Life interview](https://nintendolife.com/features/a-puzzle-should-be-structured-like-a-good-joke-the-influences-and-craft-behind-lorelei-and-the-laser-eyes); [Digital Trends](https://digitaltrends.com/?p=3603191)

**Fair play: Knox's Decalogue (1929)**
- The ten rules, paraphrased: the criminal must appear early, and readers must not have been shown the criminal's thoughts. **"All supernatural or preternatural agencies are ruled out."** No more than one secret room. No unknown poisons. (Rule 5, "No Chinaman," is a racist period rule.) No lucky accidents or correct hunches. The detective must not be the culprit. The detective must disclose clues. The Watson must not hide his thoughts. Twins only if the reader has been prepared. — [Wikipedia: Ronald Knox](https://en.wikipedia.org/wiki/Ronald_Knox)

### Inferences
- **A deduction format for "unclean force or people?":** for each "soul" in a case, the player fills a Golden Idol / Obra Dinn-style sentence in the census ledger, such as "[Name] was [taken/killed/hidden/drowned] by [person/rusalka/witch/no one] because [motive]." Confirm **only the factual skeleton** (who, where, when) in batches of three. **Never confirm the cause category** (unclean or human). That stays Pentiment-ambiguous and feeds the moral ledger.
- **A two-reading fair-play rule** (a replacement for Knox #2): every case must support *both* a mundane and a supernatural reading with planted, disclosed evidence, as in Gogol's "Viy" or "May Night." The *factual* layer must still obey Knox (disclosed clues, culprit introduced early, no luck), while the *metaphysical* layer is deliberately undecidable. Write a two-column "evidence for people / evidence for the unclean" sheet per case as a QA tool.
- **Rule people in:** motive clues should add suspects, as in Pentiment. Red herrings work best as *true facts that implicate a sympathetic person*, not as false facts.
- **Disco Elysium voices:** inner voices for the seminarian (Scholastic Latin, Fear of God, Clerk's Pedantry, Folk Memory) that **can give bad advice** are a cheap way to keep the supernatural reading alive without confirming it.
- **Ace Attorney chunking:** within a case, break deduction into 3–4 mini-confirmations, not one final exam. Each gives an "aha" and a bottleneck.
- **Pitfalls:** the Heaven's Vault critique (blocking an "obvious" answer feels unfair); over-complexity (Golden Idol's "roof of complexity"); characters who fade between acts (Pentiment playtests); confirming the supernatural, which kills the core question.

### Gaps
- I could not fetch the Thinky Games Golden Idol feature (HTTP 403). The exact partial-feedback threshold is stated loosely across sources.
- No primary Lucas Pope devlog text on the batch-of-three rationale was retrieved, only Wikipedia's summary.
- No developer interview on The Roottrees are Dead's fairness design was found. A search on the designer named in the brief, "Robert Lester," returned nothing tying him to the game; the credited developers are Jeremy Johnston and Robin Ward.
- No design documentation on Sherlock Holmes: Chapter One's exact wrong-answer acceptance was found.

---

## 4. Tone and atmosphere: Twin Peaks' influence on games, King's small-town horror, Lynch's dream logic, folk horror, Gogol's skaz and an unreliable in-world narrator, humour and dread

### Takeaway
Three levers recur. **The mundane holds the macabre** (Wallace's definition of "Lynchian"; King's ordinary towns with one detail that rings false). **Folk horror is a chain**: landscape, isolation, skewed belief, "happening." **A spoken, digressive, unreliable narrator** (Gogol's skaz via Rudy Panko) carries comedy and dread in the same sentence. Call of Juarez: Gunslinger shows that an unreliable retelling can be a *mechanic*: the level changes when the listeners object.

### Cited Findings
**Gogol, skaz and Rudy Panko**
- Evenings on a Farm near Dikanka (1829–32) is framed by the beekeeper **Pan'ko the Red-haired (Rudy Panko)**. His preface addresses the reader informally, as if at his table, and drifts into mundane details before returning to the story. The collection's tone is "a carefully arranged mingling of the horrifying and the humorous." Gogol asked his mother to write down village customs, dress, superstitions and tales as source material. — [Wikipedia: Evenings on a Farm Near Dikanka](https://en.wikipedia.org/wiki/Evenings_on_a_Farm_Near_Dikanka)
- The frame is openly unreliable: in "Ivan Fyodorovich Shponka and His Aunt," the manuscript is incomplete because Panko's wife, who can't read, used pages to bake pies. — [Wikipedia: Shponka](https://en.wikipedia.org/wiki/Ivan_Fyodorovich_Shponka_and_His_Aunt)
- Skaz (from skazat', "to tell") is a narration imitating oral, improvised speech. The term was coined by Boris Eikhenbaum in "How Gogol's 'Overcoat' Is Made" (1919). Bakhtin later separated simple skaz from **double-voiced skaz** (where the author's parody shows through) and placed Gogol in the latter. — [Wikipedia: Skaz](https://en.wikipedia.org/wiki/Skaz)
- One analysis argues skaz is the basis of the Overcoat's humour, which comes from language itself. — [SIC journal (Brajnović)](https://www.sic-journal.org/Article/GeneratePDF/286)

**Unreliable retelling as a mechanic**
- Call of Juarez: Gunslinger (2013): the old bounty hunter Silas Greaves tells his tales in a saloon in 1910, and gameplay plays as flashbacks. **When listeners challenge him, the level changes on the spot**, with elements added or removed (a ladder "miraculously appears"). The campaign stays linear. — [MobyGames](https://www.mobygames.com/game/60739); [Wikipedia](https://en.wikipedia.org/wiki/Call_of_Juarez:_Gunslinger); [Press Start review](https://press-start.com.au/?p=2614)

**Lynch, Twin Peaks and games**
- David Foster Wallace's mock definition of "Lynchian" (Premiere, 1996): an irony in which "the very macabre and the very mundane combine in such a way as to reveal the former's perpetual containment within the latter." — [LA Review of Books: Defining Lynchian](https://lareviewofbooks.org/article/defining-lynchian/); [Granneman blog reprint](https://blog.granneman.com/2009/04/18/david-foster-wallace-on-david-lynch)
- Alan Wake: Sam Lake said "the most obvious Twin Peaks related things are naturally the location and the setting, the small town of Bright Falls." Remedy's Oskari Häkkinen called Twin Peaks a big inspiration, and for Alan Wake 2 Lake also cited Fincher's Se7en. (The quotes are relayed through secondary roundups, and the Eurogamer original was not retrieved.) — [Stevivor: Twin Peaks' influence on video games](https://stevivor.com/features/in-depth/twin-peaks-influence-video-games/); [Decrypt](https://decrypt.co/201876/god-mode-9-things-watch-read-play-before-alan-wake-2)
- Kentucky Route Zero: at GDC 2013, Jake Elliott named David Lynch alongside Herzog and Kurosawa, and credited the focus on "character-driven mysteries rather than puzzles." Adam Cadre's Photopia (1998) was a major influence on the writing. The game draws on magical realism, Southern Gothic and Tennessee Williams. — [Gaming Trend (GDC 2013)](https://gamingtrend.com/news/inspiration-and-intrigue-kentucky-route-zero-at-gdc-2013); [Funambulism interview](https://funambulism.com/2013/07/23/interview-cardboard-computer-on-kentucky-route-zero/); [Hyperallergic](https://hyperallergic.com/539015/a-dystopian-david-lynch-inspired-video-game-that-leaves-its-meaning-up-to-you/)

**Stephen King small-town horror (lower-authority sources)**
- Derry and Castle Rock are built from routine family life and blue-collar work, and the uncanny arrives through ordinary spaces (drains, basements, back roads). The technique is to "let one, paltry detail ring false and then stay with it." — [Vocal essay (low authority)](https://vocal.media/bookclub/stephen-king-the-darkness-we-pretend-not-to-see)
- In 'Salem's Lot, the town's gossip and conformity carry much of the menace (Mabel Werts watching the neighbours with binoculars). — [Berkeley Beacon](https://berkeleybeacon.com/stephen-king-and-the-american-gothic)

**Folk horror**
- Adam Scovell's "folk horror chain" has four links: **landscape**, **isolation** (communities "cut off from some established social progress"), **skewed belief systems and morality**, and **the happening/summoning**. — [British Fantasy Society](https://britishfantasysociety.org/?p=56539); [Spooky Scary Society](https://spookyscarysociety.com/2019/08/13/folk-horror-heredity)
- A critique: the chain becomes problematic when rurality is treated as synonymous with landscape, and it obscures how landscape itself generates dread. — [Revenant Journal](https://www.revenantjournal.com/contents/a-fear-of-the-folk-on-topophobia-and-the-horror-of-rural-landscapes/)
- One-Eyed Likho (a Slavic folk horror game) chose folklore to avoid an overused fantasy setting, kept the whole game grayscale, and cites The Witch and The Lighthouse as influences. — [Epic Games Store feature](https://store.epicgames.com/news/how-one-eyed-likho-brings-slavic-folk-horror-to-life)

**Humour and dread**
- Lucas Pope deliberately added "more lighthearted encounters and individuals" for levity in an oppressive setting. — [Reason](https://reason.com/2013/09/26/papers-please-politics-in-games-and-the/)
- Sasko's pacing graph treats the low-tension points (where humour lives) as being as important as the peaks. — [Destructoid](https://www.destructoid.com/cd-projekt-red-designer-breaks-down-the-witcher-3s-best-quest/)

### Inferences
- **Panko as frame narrator plus mechanic:** each case is "retold" at Panko's table or a fair. Listeners (a sceptical deacon, a credulous widow, the Treasury clerk) can interject, as in Call of Juarez. Their objections can (a) change what the painted scene shows (a goat becomes a chort, or the reverse) and (b) record which version the investigator *signs*. That makes the "unreliable retelling" literally choose between the people and the unclean readings without confirming either.
- **Pages missing because of pies (Gogol's own device)** is a diegetic excuse for gaps, unknowns and save-file "lost pages" (for example, a skipped case summarised by Panko).
- **Lynchian rule for writers:** every eerie beat should sit inside a domestic, comic, bureaucratic routine (a census form, a borscht, a fair price dispute). The macabre should be "contained in" the mundane, and the census of souls is itself the ultimate mundane-macabre object.
- **King rule:** each village should have one detail that rings false, revisited three times, and a gossip network that spreads both truth and lies (a Mabel Werts figure such as a sexton's wife).
- **Folk horror chain per case:** the steppe or marsh (landscape), a cut-off khutir (isolation), local belief that overrides church or state law (skewed belief), and the "happening" (Kupala night, Christmas Eve). The happening should be the case's bottleneck scene.
- **Double-voiced skaz:** Panko's comic voice should let a darker authorial voice show through occasionally. Pitfall: an over-folksy voice turns into pastiche. Keep digressions short and periodic, as Pope rationed levity.

### Gaps
- "Mothmother?" in the brief could not be identified as a game, so no claims were made about it.
- Deadly Premonition / Swery: no interview with direct quotes was retrieved.
- There is no high-quality craft analysis of King's technique here. The two sources are an essay site and a student paper, and should be treated as low confidence. King's own On Writing was not consulted.
- No scholarly source specifically on Panko's *unreliability* was found beyond the textual evidence of the frames.

---

## 5. Tools and workflow: ink vs Yarn Spinner vs Twine/Chapbook vs articy, ink on the web (inkjs), story bible and state tracking, writing with an AI co-author

### Takeaway
For a web game with heavy state, **ink + inkjs** is the most direct fit as of 2026: inkjs 2.4.0 shipped in Feb 2026, has zero dependencies, runs in all browsers and includes a JS compiler. ink also tracks visit counts automatically, and its compiler flags dead ends. **Yarn Spinner 3.x** now has storylet- and salience-style **node groups with `when:` conditions**, which makes it the closest built-in QBN, but its first-class runtimes target Unity, Godot and Unreal, not the web. **articy:draft X** suits large visual flow databases but froze on Disco Elysium's script size. Twine is good for paper prototyping but not designed for QBN. AI co-writing has measurable consistency failures, so it needs a canon bible and automated checks.

### Cited Findings
**Current versions (verified Oct 2026)**
- **inkjs 2.4.0**, published 2026-02-17 (previous: 2.3.2 on 2025-04-07). "inkjs is fully compatible with the original version, has zero dependency and works in all browsers and node.js." It includes an inkjs compiler (inkjs-compiler.js / an online compiler) and TypeScript support. Compatibility table: ink 1.2.0 maps to inkjs 2.3.0 and ink 1.1.1 to inkjs 2.2.*. — [npm registry: inkjs](https://www.npmjs.com/package/inkjs) (data pulled from registry.npmjs.org)
- **ink**: the latest GitHub release is **1.2.1** (universal macOS inklecate builds, small fixes). **1.2.0 "Highland"** added choice labels on their own line, List API tweaks, fixes for background-save choice threads and choice tags, and a .NET Standard runtime. 1.1.1 added dynamic tags and tags on choices. 1.0.0 added beta **parallel flows** and a boolean type. 0.9.0 added shuffle-once/stopping sequences and background state saving. (The releases page shows day and month but not the year for 1.2.1.) — [GitHub: inkle/ink releases](https://github.com/inkle/ink/releases)
- **Yarn Spinner 3.2.2** on NuGet (2026-08-11). The 3.x line added (3.0, May–June 2025) **enums, smart variables, `once` statements, and node groups with `when:` headers chosen by a configurable saliency strategy**, plus `HasSalientContent` and `has_any_content`. 3.1.0 (Dec 2025) made option groups fall through when no option is available, and 3.2.0 (Mar 2026) added stable diagnostic error codes. — [GitHub: YarnSpinner releases](https://github.com/YarnSpinnerTool/YarnSpinner/releases); [NuGet: YarnSpinner](https://www.nuget.org/packages/YarnSpinner)
- A community JS runtime for Yarn, **yarn-bound 0.5.5**, was last published 2024-11-29. — [npm: yarn-bound](https://www.npmjs.com/package/yarn-bound)
- **Twine**: Wikipedia lists **2.12.0 (10 April 2026)** as the latest stable release. 2.10.0 (Nov 2024) bundled **Chapbook 2.3.0** and moved the story-format list into a dialog. — [Wikipedia: Twine](https://en.wikipedia.org/wiki/Twine_(software)); [Adaptiva patch notes for 2.10](https://adaptiva.com/patch-library/1000003877_patch_for_twine)
- **articy:draft X**: the latest confirmed line is **4.2 (14 Aug 2025; 4.2.2 on 26 Aug 2025)**, which brought a new project file format (older versions can't open migrated projects), searchable template dropdowns and Perforce SSO. 4.1 added **seen/unseen/fallback keywords for choice points** and moved to .NET 8 for big flow graphs. — [articy 4.2 changes](https://www.articy.com/help/adx/Changes_4_2.html); [articy What's New](https://www.articy.com/help/adx/WhatsNew.html)

**Tool behaviour and fit**
- ink automatically tracks visited nodes, so later text can vary. It has minimal markup and nested sub-choices without labels, and its **compiler flags situations where the story would stall**. — [IF50: 80 Days](https://if50.substack.com/p/2014-80-days)
- Emily Short: Twine "is not really designed for some of these structures" (QBN or salience), so don't assume it is the only prototyping option. Prototype storylets on index cards. — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/); [Storylets: You Want Them](https://emshort.blog/2019/11/29/storylets-you-want-them/)
- Disco Elysium used articy. The Noclip documentary (Jan 2026) reports that articy slowed sharply and then **froze** as the script grew, and its makers said the tool "was not designed for such long and complex script chains." Helen Hindpere: "there was so much text that control over the material began to be lost." — [iXBT Games](https://ixbt.games/en/news/2026/01/16/disco-elysium-uperlas-v-texniceskii-predel-iz-za-obieema-scenariia.html)
- CDPR's process: a story team reviews quests as they are created to make sure they fit the main narrative, designers play each other's quests, and "we just rework all the time." — [GameBanshee Witcher 3 interview](https://gamebanshee.com/x8fx); [Destructoid](https://www.destructoid.com/cd-projekt-red-designer-breaks-down-the-witcher-3s-best-quest/)
- Short suggests testing salience systems with **thousands of randomized playthroughs, visualized**. — [Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)

**AI co-author: measured risks**
- NCP-Bench (ICML 2026): 100 narrative environments built from movie synopses. The best model (GPT-5.2) has only a **42% "survival" rate after 20 turns** of staying consistent with narrative commitments, **fact-conflict rates range from 40% to 68%** across models, and only isolated runs met all commitments within 100 turns. — [arXiv 2608.08160](https://arxiv.org/abs/2608.08160)
- "Lost in Stories" (ACL 2026 Findings): consistency bugs in long LLM-generated stories are most common in **factual and temporal** dimensions and tend to cluster **mid-narrative**. — [ACL Anthology preview](https://preview.aclanthology.org/ingest-acl/2026.findings-acl.410/)
- Reception risk: The Roottrees are Dead's 2025 commercial release replaced the jam version's AI art with artist-made illustrations. — [Wikipedia](https://en.wikipedia.org/wiki/The_Roottrees_are_Dead)

### Inferences
- **Recommended stack (web, hobby):** write the story in ink (Inky editor) with one `.ink` file per case plus `globals.ink` for the ledger qualities (use ink `LIST`s for soul statuses and `VAR`s for meta-qualities). Run it in the browser with inkjs 2.4.0, and keep the ink state JSON as the *literal save file* inside the "census book." Use ink tags (`#portrait:`, `#scene:`, `#sfx:`) to drive the visual-novel layer and the isometric painting. ink's parallel flows (beta) can hold Panko's frame narration alongside the case.
- **When to choose Yarn Spinner instead:** only if the project moves to Godot or Unity. Its 3.x node groups with `when:` are a built-in storylet and salience selector, a real advantage for ambient village barks.
- **articy:** overkill for a hobby team, and the Disco Elysium freeze shows its scale ceiling. A spreadsheet or Markdown story bible plus ink is enough.
- **Story bible contents:** (1) a canon sheet of names, dates (1811 calendar, feast days), places and who is alive; (2) a quality dictionary listing every variable with its range, owner case and who reads it; (3) a per-case flowchart showing bottlenecks; (4) the two-column "people vs unclean" evidence sheet (see §3); (5) a consequence ledger of "if X in case N, then callback in case M."
- **AI co-writing guardrails** (inferred from the benchmarks): never let the model hold canon in its head. Feed it the bible each time, and have it draft *variants inside a fixed node* rather than plot. Run automated checks: compile ink (dead ends), plus a script that random-walks the ink thousands of times (Short's method) and asserts invariants (dead souls don't speak unless flagged unclean; dates are monotonic). Put extra human review on mid-case and temporal facts, the measured weak spots. Avoid AI-generated art in a public release (the Roottrees precedent).

### Gaps
- I could not access GitHub's API in this session, so ink 1.2.1's exact year and the latest Inky version are unconfirmed. Check https://github.com/inkle/ink/releases and https://github.com/inkle/inky/releases.
- No 2026 articy:draft release was found. The 4.2 line (Aug 2025) is the latest confirmed.
- Twine 2.11 and 2.12 release notes were not retrieved, only Wikipedia's version and date.
- No official Yarn Spinner 3.x JavaScript or web runtime was confirmed.
- Emily Short's own writing on LLM co-authoring was not found in this pass.

---

## 6. Scope guidance: word counts and dialogue sizes of comparable games, and what's realistic for a hobby project

### Takeaway
The big references are huge (Disco Elysium about 1M words, 80 Days 700k+), but players see only a slice (80 Days reveals under 10% per run). Smaller, more relevant benchmarks are team-of-13 Pentiment, the two-brother Golden Idol (11 cases) and solo-dev Obra Dinn (60 crew, cut from 80) and Papers, Please. Choice of Games' floor of **100k total words / 20k per playthrough** is a useful commercial-IF yardstick. A hobby 8-case season is realistic at roughly 8–15k words per case plus a shared frame, if carry-over is mostly variable text.

### Cited Findings
- **Disco Elysium**: "IT IS ONE MILLION WORDS LONG"; 70 characters, all with partial voice acting (ZA/UM dev blog, Sept 2019). — [GameBanshee](https://www.gamebanshee.com/398x3)
- A GCores developer piece says about 70% of the original 1M-word script was rewritten for later versions. This comes from a search summary and was not verified in full. — [GCores](https://www.gcores.com/articles/158712)
- Writer Marten Rattasepp spent up to two months on individual characters' dialogue, where several days is typical in RPGs. — [iXBT Games / Noclip](https://ixbt.games/en/news/2026/01/16/disco-elysium-uperlas-v-texniceskii-predel-iz-za-obieema-scenariia.html)
- **80 Days**: 700,000+ words, 150 cities, 16,000 choices, and most journeys show under 10% of the text. It began as a "side project" while Sorcery! 3 was in development. — [IF50](https://if50.substack.com/p/2014-80-days); [Game Developer postmortem](https://gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i-)
- **Pentiment**: Sawyer said "We started with just two people and now we are a team of thirteen." It is about 20 hours of play. — [Checkpoint Gaming](https://checkpointgaming.net/features/2022/08/pentiment-preview-obsidian-shows-us-their-unique-gorgeous-diversion); [MobileSyrup](https://mobilesyrup.com/2022/08/24/obsidian-entertainment-xbox-preview/); [Windows Central review](https://www.windowscentral.com/gaming/xbox/pentiment-review)
- **The Case of the Golden Idol**: 11 cases, a core team of two brothers (programmer and artist) plus a composer and a publisher (Playstack), made in Godot. — [Wikipedia](https://en.wikipedia.org/wiki/The_Case_of_the_Golden_Idol)
- **Return of the Obra Dinn**: a solo developer; the crew was cut from about 80 to 60, and the chapter structure was the hardest part. Pope's first vertical slice "did not scale up (at all) to making a full game" (2016 devlog, as relayed). — [Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn); [Gamereactor](https://www.gamereactor.eu/lucas-pope-found-structure-of-obra-dinn-extremely-difficult/); [Development of Obra Dinn "hits rough seas" (Polygon repost on Goodreads)](https://www.goodreads.com/author_blog_posts/10205987-development-of-papers-please-creator-s-next-game-hits-rough-seas?tab=book)
- **The Roottrees are Dead** started as a Global Game Jam 2023 project before a 2025 commercial expansion. — [Wikipedia](https://en.wikipedia.org/wiki/The_Roottrees_are_Dead)
- **Choice of Games** standard: at least 100,000 total words (prose plus code) and an average playthrough of at least 20,000 words. This is also the contest minimum. — [Choice of Games: length and coding efficiency (2017)](https://choiceofgames.com/2017/07/length-and-coding-efficiency); [CoG contest page](https://www.choiceofgames.com/contest/)
- **Mass Effect 3** reportedly imported 1000+ variables from ME2, and many were minor. — [GameBanshee](https://gamebanshee.com/kw8f6)
- **Golden Idol** hit a "roof of complexity" after its DLCs. — [Thinky Games (via search)](https://thinkygames.com/features/how-the-case-of-the-golden-idol-developers-made-one-of-the-decades-best-detective-games-twice/)

### Inferences
- **Hobby budget suggestion** (an inference, not a sourced figure): 8 cases × ~8–15k words, plus a frame and hub of ~10–20k, gives ~80–140k total words. That roughly matches the CoG "full game" floor, with a 20–35k-word playthrough. Keep about 70% of each case shared (bottleneck scenes) and about 30% variant (verdict scenes plus callbacks).
- **Per case:** 4–8 speaking characters (Pentiment's tight cast, Christie-style victim plus everyone with a motive), 3–6 "souls" to determine (Obra Dinn's 60 is a 5-year solo job), 2–4 verdict outcomes and 1–2 delayed callbacks seeded for later cases.
- **The season through-line:** ~20–40 ledger qualities (not Mass Effect's 1000+). Most should be booleans or soul statuses, plus 4–6 numeric meta-qualities.
- **Build order (Obra Dinn's lesson):** prove one complete case end to end (vertical slice) and then *re-plan*, because Pope's first slice didn't scale. Ship cases episodically (QBN suits this).
- **Pitfalls:** Disco Elysium-style rewriting at 1M words is unaffordable, so lock the canon bible before drafting. Watch the complexity ceiling in deduction puzzles. Watch tool-scale limits (articy) and variable sprawl.

### Gaps
- No reliable word count was found for Pentiment, Golden Idol, Obra Dinn, Kentucky Route Zero, Heaven's Vault or Sorcery!.
- The GCores "70% rewritten" figure was not verified against the original article.
- No survey data on realistic hobby-team writing throughput (words per week) was found.
