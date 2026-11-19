// Clear Writing items, written for Sharpen. [tier, correct sentence, wrong sentence, the quick rule]
const RAW = [
  // Tier 1
  [1, 'Their car is parked over there.', 'There car is parked over their.', '"Their" means it belongs to them. "There" is a place.'],
  [1, "It's going to rain today.", 'Its going to rain today.', '"It\'s" is short for "it is." If "it is" fits, use the apostrophe.'],
  [1, 'The dog wagged its tail.', "The dog wagged it's tail.", '"Its" (no apostrophe) means belonging to it.'],
  [1, "You're going to love this.", 'Your going to love this.', '"You\'re" is short for "you are."'],
  [1, 'I could have helped.', 'I could of helped.', 'It\'s "could have" (or "could\'ve"), never "could of."'],
  [1, 'She is taller than me.', 'She is taller then me.', '"Than" compares things. "Then" is about time.'],
  [1, "We're almost home.", 'Were almost home.', '"We\'re" is short for "we are."'],
  [1, "Don't lose your keys.", "Don't loose your keys.", '"Lose" means misplace. "Loose" means not tight.'],
  [1, "Who's coming to dinner?", 'Whose coming to dinner?', '"Who\'s" is short for "who is." "Whose" asks who owns something.'],
  [1, 'I learned a lot today.', 'I learned alot today.', '"A lot" is always two words.'],
  [1, 'I want to come, too.', 'I want to come, to.', '"Too" means also (or more than enough).'],
  [1, 'Each of the boxes is heavy.', 'Each of the boxes are heavy.', '"Each" means one at a time, so it takes "is."'],
  [1, 'He and I went to the game.', 'Me and him went to the game.', 'Drop the other person to test it: "I went," not "me went."'],
  [1, 'Please send it to Sam and me.', 'Please send it to Sam and I.', 'Drop "Sam and" to test it: "send it to me," not "send it to I."'],
  [1, 'She did well on the test.', 'She did good on the test.', '"Well" describes how you do something.'],

  // Tier 2
  [2, 'The new rule will affect everyone.', 'The new rule will effect everyone.', '"Affect" is usually the action (to influence). "Effect" is usually the result.'],
  [2, 'The medicine had a strong effect.', 'The medicine had a strong affect.', '"Effect" is the result. "An effect," "the effect."'],
  [2, 'There are fewer cars on the road today.', 'There are less cars on the road today.', 'Use "fewer" for things you can count, "less" for amounts (less traffic, fewer cars).'],
  [2, "Between you and me, the plan won't work.", "Between you and I, the plan won't work.", 'After "between," use "me."'],
  [2, "I'm going to lie down for a bit.", "I'm going to lay down for a bit.", '"Lie" means to rest your body. "Lay" means to put something down.'],
  [2, 'Walking to work, I saw a deer.', 'Walking to work, a deer crossed in front of me.', 'The opening phrase describes whoever comes right after the comma. The deer wasn\'t walking to work.'],
  [2, 'We had a great time; the food was amazing.', 'We had a great time, the food was amazing.', 'Two complete sentences need a period or semicolon between them, not just a comma.'],
  [2, "If I were you, I'd take the job.", "If I was you, I'd take the job.", 'For imagined situations, use "were": "if I were you."'],
  [2, 'I feel bad about what happened.', 'I feel badly about what happened.', 'After "feel," use "bad." "Feel badly" would mean your sense of touch is poor.'],
  [2, 'Please ensure the door is locked.', 'Please insure the door is locked.', '"Ensure" means make sure. "Insure" is about insurance.'],
  [2, 'The principal announced a snow day.', 'The principle announced a snow day.', 'A "principal" is the head of a school (or "main"). A "principle" is a rule or belief.'],
  [2, 'Let me compliment the chef.', 'Let me complement the chef.', '"Compliment" is praise. "Complement" means to go well with something.'],
  [2, 'Neither of the options is perfect.', 'Neither of the options are perfect.', '"Neither" means not one and not the other, so it takes "is" in careful writing.'],
  [2, 'I bought apples, bread, and milk.', 'I bought apples, bread and, milk.', 'Commas go between the items in a list, not after "and."'],

  // Tier 3
  [3, 'Regardless of the weather, we\'ll go.', 'Irregardless of the weather, we\'ll go.', '"Regardless" is the standard word. "Irregardless" is a double negative.'],
  [3, 'The number of visitors has grown.', 'The number of visitors have grown.', '"The number" is one thing, so it takes "has." ("A number of people have...")'],
  [3, 'The criteria are listed below.', 'The criteria is listed below.', '"Criteria" is plural. One is a "criterion."'],
  [3, 'He implied that I was late.', 'He inferred that I was late.', 'The speaker "implies" (hints). The listener "infers" (concludes).'],
  [3, 'She likes hiking, swimming, and biking.', 'She likes hiking, swimming, and to bike.', 'Items in a list should match in form: hiking, swimming, biking.'],
  [3, 'The flowers smell sweet.', 'The flowers smell sweetly.', 'After smell, taste, look or feel, use the describing word: "smell sweet."'],
  [3, 'Call Jen or me with questions.', 'Call Jen or myself with questions.', 'Use "myself" only when "I" is also in the sentence: "I did it myself."'],
  [3, 'Yesterday I lay on the couch for hours.', 'Yesterday I laid on the couch for hours.', 'The past of "lie" (rest) is "lay." "Laid" means put something down.'],
  [3, 'She alluded to a surprise.', 'She eluded to a surprise.', '"Allude" means hint at. "Elude" means escape.'],
  [3, 'Please be discreet about the party.', 'Please be discrete about the party.', '"Discreet" means careful to keep things quiet. "Discrete" means separate.'],
  [3, 'The bike stayed stationary.', 'The bike stayed stationery.', '"Stationary" means not moving. "Stationery" is writing paper.'],
  [3, 'The ad piqued my interest.', 'The ad peaked my interest.', '"Pique" means to stir up curiosity. "Peak" is the top.'],
  [3, 'We waited with bated breath.', 'We waited with baited breath.', '"Bated" means held back. (Bait is for fishing.)'],
  [3, 'The kids had free rein of the backyard.', 'The kids had free reign of the backyard.', 'It comes from loosening a horse\'s "rein," not a king\'s "reign."'],
];

export const SENTENCES = RAW.map(([tier, right, wrong, why], i) => ({ id: 's' + i, tier, right, wrong, why }));
