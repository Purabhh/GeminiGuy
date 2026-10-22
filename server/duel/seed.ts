import type { ExamId, Section } from '../../shared/duel.ts'
import type { Domain } from './outline.ts'

// The hand-written starter bank: original questions in the style of the
// digital SAT and PSAT, one per skill area at a spread of difficulties. The
// right answer is always the first choice here; the engine shuffles the
// choices for every match. `rating` is the starting difficulty, which moves
// with how players actually do (shared/rating.ts questionUpdate).

export interface SeedQuestion {
  key: string // stable id, so reseeding never duplicates
  exams: ExamId[]
  section: Section
  domain: Domain
  rating: number
  passage: string | null
  prompt: string
  choices: [string, string, string, string] // [right, wrong, wrong, wrong]
  explanation: string
}

const BOTH: ExamId[] = ['sat', 'psat']

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ---- Math: Algebra
  { key: 'm-alg-01', exams: BOTH, section: 'math', domain: 'algebra', rating: 850, passage: null,
    prompt: 'If 3x + 7 = 25, what is the value of x?', choices: ['6', '4', '8', '18'],
    explanation: 'Subtract 7 from both sides to get 3x = 18, then divide by 3.' },
  { key: 'm-alg-02', exams: BOTH, section: 'math', domain: 'algebra', rating: 900, passage: null,
    prompt: 'A line passes through the points (0, 2) and (4, 10). What is the slope of the line?', choices: ['2', '4', '8', '1/2'],
    explanation: 'Slope is rise over run: (10 − 2) / (4 − 0) = 8 / 4 = 2.' },
  { key: 'm-alg-03', exams: BOTH, section: 'math', domain: 'algebra', rating: 850, passage: null,
    prompt: 'A gym charges a $25 sign-up fee plus $15 per month. Which expression gives the total cost, in dollars, for m months?', choices: ['15m + 25', '25m + 15', '40m', '15(m + 25)'],
    explanation: 'The $15 is paid every month (15m) and the $25 fee is paid once.' },
  { key: 'm-alg-04', exams: BOTH, section: 'math', domain: 'algebra', rating: 950, passage: null,
    prompt: 'If x + y = 10 and x − y = 4, what is the value of x?', choices: ['7', '3', '6', '14'],
    explanation: 'Add the two equations: 2x = 14, so x = 7.' },
  { key: 'm-alg-05', exams: BOTH, section: 'math', domain: 'algebra', rating: 950, passage: null,
    prompt: 'What value of x satisfies 2(x − 3) = x + 5?', choices: ['11', '8', '−1', '2'],
    explanation: 'Expand to 2x − 6 = x + 5, then subtract x and add 6: x = 11.' },
  { key: 'm-alg-06', exams: BOTH, section: 'math', domain: 'algebra', rating: 1300, passage: null,
    prompt: 'For what value of k does the system 2x + 3y = 6 and 4x + ky = 5 have no solution?', choices: ['6', '3', '−6', '12'],
    explanation: 'No solution means parallel lines: the x and y coefficients must be in the same ratio, 4/2 = k/3, so k = 6 (and 5 is not 2 × 6).' },

  // ---- Math: Advanced Math
  { key: 'm-adv-01', exams: BOTH, section: 'math', domain: 'advanced', rating: 1000, passage: null,
    prompt: 'If f(x) = x² − 4x + 1, what is f(3)?', choices: ['−2', '4', '−4', '22'],
    explanation: 'f(3) = 9 − 12 + 1 = −2.' },
  { key: 'm-adv-02', exams: BOTH, section: 'math', domain: 'advanced', rating: 1100, passage: null,
    prompt: 'What is the sum of the solutions to x² − 5x + 6 = 0?', choices: ['5', '−5', '6', '1'],
    explanation: 'It factors as (x − 2)(x − 3) = 0, so the solutions are 2 and 3, which add to 5.' },
  { key: 'm-adv-03', exams: BOTH, section: 'math', domain: 'advanced', rating: 1000, passage: null,
    prompt: 'Which expression is equivalent to (x + 3)²?', choices: ['x² + 6x + 9', 'x² + 9', 'x² + 3x + 9', 'x² + 6x + 6'],
    explanation: '(x + 3)(x + 3) = x² + 3x + 3x + 9 = x² + 6x + 9.' },
  { key: 'm-adv-04', exams: BOTH, section: 'math', domain: 'advanced', rating: 1150, passage: null,
    prompt: 'A town has 200 rabbits, and the number doubles every 3 years. How many rabbits will there be after 9 years?', choices: ['1,600', '800', '1,200', '5,400'],
    explanation: '9 years is 3 doublings: 200 × 2 × 2 × 2 = 1,600.' },
  { key: 'm-adv-05', exams: BOTH, section: 'math', domain: 'advanced', rating: 1100, passage: null,
    prompt: 'If 2^(x + 1) = 32, what is the value of x?', choices: ['4', '5', '16', '3'],
    explanation: '32 = 2⁵, so x + 1 = 5 and x = 4.' },
  { key: 'm-adv-06', exams: BOTH, section: 'math', domain: 'advanced', rating: 1150, passage: null,
    prompt: 'What is the minimum value of y = 2(x − 3)² + 4?', choices: ['4', '3', '−3', '2'],
    explanation: 'A square is never negative, so y is smallest when x = 3, giving y = 4.' },

  // ---- Math: Problem-Solving and Data Analysis
  { key: 'm-psda-01', exams: BOTH, section: 'math', domain: 'psda', rating: 1150, passage: null,
    prompt: 'A $40 shirt is on sale for 25% off. A 10% sales tax is then added to the sale price. What is the total cost?', choices: ['$33', '$34', '$35', '$30'],
    explanation: '25% off $40 is $30; 10% tax on $30 adds $3, for $33.' },
  { key: 'm-psda-02', exams: BOTH, section: 'math', domain: 'psda', rating: 1000, passage: null,
    prompt: 'The mean of 4, 8, 10, 14 and x is 10. What is x?', choices: ['14', '10', '12', '16'],
    explanation: 'Five numbers with mean 10 add to 50. 4 + 8 + 10 + 14 = 36, so x = 14.' },
  { key: 'm-psda-03', exams: BOTH, section: 'math', domain: 'psda', rating: 900, passage: null,
    prompt: 'A recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of sugar go with 9 cups of flour?', choices: ['6', '4.5', '8', '13.5'],
    explanation: '9 cups of flour is 3 times the recipe, so use 3 × 2 = 6 cups of sugar.' },
  { key: 'm-psda-04', exams: BOTH, section: 'math', domain: 'psda', rating: 950, passage: null,
    prompt: 'A bag holds 5 red, 3 blue and 2 green marbles. One marble is picked at random. What is the probability that it is not red?', choices: ['1/2', '1/5', '3/10', '1/3'],
    explanation: '5 of the 10 marbles are not red, so the probability is 5/10 = 1/2.' },

  // ---- Math: Geometry and Trigonometry
  { key: 'm-geo-01', exams: BOTH, section: 'math', domain: 'geometry', rating: 900, passage: null,
    prompt: 'A right triangle has legs of length 6 and 8. What is the length of its hypotenuse?', choices: ['10', '14', '12', '48'],
    explanation: '6² + 8² = 36 + 64 = 100, and √100 = 10.' },
  { key: 'm-geo-02', exams: BOTH, section: 'math', domain: 'geometry', rating: 1100, passage: null,
    prompt: 'A circle has an area of 49π. What is its circumference?', choices: ['14π', '7π', '49π', '28π'],
    explanation: 'πr² = 49π gives r = 7, and the circumference is 2πr = 14π.' },
  { key: 'm-geo-03', exams: BOTH, section: 'math', domain: 'geometry', rating: 850, passage: null,
    prompt: 'Two angles of a triangle measure 40° and 65°. What is the measure of the third angle?', choices: ['75°', '85°', '105°', '65°'],
    explanation: 'A triangle’s angles add to 180°: 180 − 40 − 65 = 75.' },
  { key: 'm-geo-04', exams: BOTH, section: 'math', domain: 'geometry', rating: 1250, passage: null,
    prompt: 'If sin(x°) = cos(30°) and 0 < x < 90, what is the value of x?', choices: ['60', '30', '45', '90'],
    explanation: 'The sine of an angle equals the cosine of its complement, so x = 90 − 30 = 60.' },

  // ---- Reading and Writing: Craft and Structure
  { key: 'rw-craft-01', exams: BOTH, section: 'rw', domain: 'craft', rating: 900,
    passage: 'The committee’s report was ______: in just two pages, it covered every major issue the town faced.',
    prompt: 'Which choice completes the text with the most logical and precise word?', choices: ['concise', 'verbose', 'tentative', 'ornate'],
    explanation: 'Covering everything in two pages means the report was brief but complete: concise.' },
  { key: 'rw-craft-02', exams: BOTH, section: 'rw', domain: 'craft', rating: 950,
    passage: 'Although the first trial results were promising, the researchers remained ______, noting that the sample was small.',
    prompt: 'Which choice completes the text with the most logical and precise word?', choices: ['cautious', 'elated', 'indifferent', 'careless'],
    explanation: '“Although” sets up a contrast with “promising”, and a small sample is a reason to hold back: cautious.' },
  { key: 'rw-craft-03', exams: BOTH, section: 'rw', domain: 'craft', rating: 1000,
    passage: 'Many people assume that deserts are nearly lifeless. In fact, the Sonoran Desert supports more than 2,000 plant species, many of which bloom only after rare winter rains.',
    prompt: 'Which choice best states the main purpose of the text?', choices: ['To challenge a common belief about deserts', 'To explain how winter rain forms', 'To compare two different deserts', 'To argue that deserts need protection'],
    explanation: 'The text names an assumption (“nearly lifeless”) and then counters it with evidence (“In fact…”).' },

  // ---- Reading and Writing: Information and Ideas
  { key: 'rw-info-01', exams: BOTH, section: 'rw', domain: 'info', rating: 900,
    passage: 'When the empty lot on Pine Street became a community garden, neighbors who had never spoken began trading tomatoes and gardening tips. Within a year, the garden’s weekly potluck was the busiest event on the block.',
    prompt: 'Which choice best states the main idea of the text?', choices: ['The garden helped bring the neighbors together.', 'Tomatoes grow especially well on Pine Street.', 'Potlucks are more popular than gardens.', 'The lot had been empty for many years.'],
    explanation: 'Both details, trading with strangers and a busy potluck, show the garden connecting people.' },
  { key: 'rw-info-02', exams: BOTH, section: 'rw', domain: 'info', rating: 950,
    passage: 'A student claims that octopuses can solve problems to get what they want.',
    prompt: 'Which finding, if true, would most directly support the student’s claim?', choices: ['In a lab study, octopuses learned to unscrew jar lids to reach food inside.', 'Octopuses have three hearts.', 'Some octopus species live less than two years.', 'Octopuses can change the color of their skin quickly.'],
    explanation: 'Only the jar study shows an octopus working out how to reach a goal.' },
  { key: 'rw-info-03', exams: BOTH, section: 'rw', domain: 'info', rating: 1100,
    passage: 'In an experiment, bees visited blue flowers three times as often as yellow flowers, even though both colors held exactly the same amount of nectar.',
    prompt: 'Which choice most logically follows from the text?', choices: ['The bees preferred the blue flowers for a reason other than the amount of nectar.', 'The bees could not see yellow flowers at all.', 'The bees were drawn to whichever flowers held more nectar.', 'The bees avoided flowers of every color.'],
    explanation: 'Nectar was held equal, so the preference must come from something else, such as color.' },

  // ---- Reading and Writing: Standard English Conventions
  { key: 'rw-conv-01', exams: BOTH, section: 'rw', domain: 'conventions', rating: 900,
    passage: 'The museum’s newest exhibit ______ more than 300 fossils collected over two decades.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?', choices: ['features', 'feature', 'are featuring', 'have featured'],
    explanation: 'The subject is “exhibit”, which is singular, so the verb is “features”.' },
  { key: 'rw-conv-02', exams: BOTH, section: 'rw', domain: 'conventions', rating: 1050,
    passage: 'Marie Curie won two Nobel ______ one in physics and one in chemistry.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?', choices: ['Prizes:', 'Prizes;', 'Prizes, and', 'Prizes'],
    explanation: 'A colon introduces the list that explains “two Nobel Prizes”. A semicolon needs a full sentence after it.' },
  { key: 'rw-conv-03', exams: BOTH, section: 'rw', domain: 'conventions', rating: 1150,
    passage: 'The two ______ nests were built on the same branch of the old oak.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?', choices: ['birds’', 'bird’s', 'birds', 'birds’s'],
    explanation: 'Two birds own the nests: a plural possessive, written “birds’”.' },
  { key: 'rw-conv-04', exams: BOTH, section: 'rw', domain: 'conventions', rating: 1150,
    passage: 'The storm knocked out power across the ______ crews worked through the night to restore it.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?', choices: ['city, and', 'city', 'city,', 'city and'],
    explanation: 'Two complete sentences joined by “and” need a comma before the “and”. A comma alone is a comma splice.' },

  // ---- Reading and Writing: Expression of Ideas
  { key: 'rw-expr-01', exams: BOTH, section: 'rw', domain: 'expression', rating: 850,
    passage: 'Solar panels can lower a home’s energy bills. ______, the upfront cost of installing them can be high.',
    prompt: 'Which choice completes the text with the most logical transition?', choices: ['However', 'Therefore', 'For example', 'Similarly'],
    explanation: 'The second sentence states a drawback that contrasts with the benefit: “However”.' },
  { key: 'rw-expr-02', exams: BOTH, section: 'rw', domain: 'expression', rating: 1000,
    passage: 'For decades, the town had no public library. ______, in 2019, residents voted to fund one, and it opened two years later.',
    prompt: 'Which choice completes the text with the most logical transition?', choices: ['Finally', 'For instance', 'Similarly', 'In addition'],
    explanation: 'After a long wait, the vote is the end of that wait: “Finally”.' },
  { key: 'rw-expr-03', exams: BOTH, section: 'rw', domain: 'expression', rating: 1050,
    passage: 'Octopuses have no bones. ______, they can squeeze through almost any opening larger than their hard beak.',
    prompt: 'Which choice completes the text with the most logical transition?', choices: ['As a result', 'However', 'Similarly', 'In contrast'],
    explanation: 'Squeezing through gaps is a consequence of having no bones: “As a result”.' },
  { key: 'rw-expr-04', exams: BOTH, section: 'rw', domain: 'expression', rating: 1050,
    passage: 'While researching a topic, a student has taken these notes:\n• The Great Wall of China is a series of walls built over many centuries.\n• Its total length, including all of its branches, is about 13,000 miles.',
    prompt: 'The student wants to emphasize the size of the Great Wall. Which choice most effectively uses the notes to do this?', choices: ['Including all of its branches, the Great Wall of China stretches about 13,000 miles.', 'The Great Wall of China was built over many centuries.', 'The Great Wall of China is a series of walls.', 'Many centuries passed while the Great Wall of China was built.'],
    explanation: 'Only the first choice gives the wall’s length, which is what shows its size.' },
]
