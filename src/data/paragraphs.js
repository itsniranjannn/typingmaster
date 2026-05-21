let lastParagraphIndex = -1;

export const paragraphs = [
  "Typing is a practical skill that improves communication, coding speed, and productivity in daily digital work.",
  "Consistent practice helps your fingers remember key positions, so you spend less time looking at the keyboard.",
  "A focused typing session should feel smooth and controlled, with your attention on rhythm, accuracy, and confidence.",
  "Build habits slowly and stay patient, because small daily improvements become a strong long term advantage.",
  "The art of typing combines muscle memory, rhythm, and focus into a seamless flow of expression.",
  "Speed without accuracy is meaningless, but with practice, both improve together naturally over time.",
  "Every keystroke is an opportunity to build better habits and strengthen your typing foundation.",
  "Proper posture and hand position reduce fatigue and allow for longer, more productive typing sessions.",
  "When you type with intention and mindfulness, each word becomes part of a larger creative process.",
  "The keyboard is not just a tool, but an extension of your thoughts and ideas into the digital world.",
  "Touch typing allows your mind to focus on content rather than the mechanics of finding keys.",
  "Accuracy is more important than speed initially, because bad habits are harder to break later.",
  "Modern communication relies heavily on typing skills for emails, messages, and creative writing.",
  "A typing test measures not just speed but also consistency, focus, and attention to detail.",
  "Regular practice sessions build muscle memory that persists even after long periods without typing.",
  "The sound of rapid typing can be meditative and satisfying when executed with proper technique.",
  "Learning to type efficiently opens doors to careers in programming, writing, and digital content.",
  "Typing speed is often measured in words per minute, with average users reaching fifty to eighty WPM.",
  "Professional typists can exceed one hundred WPM through years of dedicated practice and training.",
  "Competitive typing events showcase the incredible speeds and accuracies achieved by elite performers.",
  "Adaptive typing techniques can help people with disabilities maintain productivity and independence.",
  "Voice recognition technology offers an alternative to traditional keyboard typing in many situations.",
  "The history of typing technology spans from mechanical typewriters to modern digital keyboards.",
  "Ergonomic keyboards are designed to reduce strain and prevent repetitive strain injuries in typists.",
  "Online typing games make practice fun and engaging while building skills in an enjoyable format.",
  "Typing tests are commonly used in hiring processes for roles requiring significant keyboard work.",
  "Break intervals during typing sessions prevent fatigue and maintain consistent performance levels.",
  "Finger placement on the home row is the foundation of efficient and accurate typing technique.",
  "Backspace is your friend when making mistakes, but ideally you build accuracy to minimize errors.",
  "Copy typing and dictation practice improve both speed and comprehension of written material.",
  "Typing on mobile devices requires different techniques than traditional keyboard typing methods.",
  "Autocorrect features can help or hinder typing, depending on context and user preference.",
  "Public typing competitions attract thousands of participants worldwide each year.",
  "Learning to type code efficiently is essential for software developers and programmers.",
  "Typing is not just about speed but also about maintaining focus and mental clarity.",
  "Distractions during typing sessions significantly reduce performance and accuracy levels.",
  "The relationship between typing speed and intelligence is not direct or necessarily correlated.",
  "Tired fingers and fatigue are natural signs that you need to take a break from intensive typing.",
  "Progressive typing challenges help users gradually increase speed and accuracy over weeks and months.",
  "Touchscreen typing presents unique challenges compared to traditional keyboard interfaces.",
  "Keyboard shortcuts combined with fast typing can dramatically increase overall productivity.",
  "Gaming keyboards are often preferred by typists for their responsiveness and tactile feedback.",
  "Typing games range from simple practice tools to complex games with storylines and achievements.",
  "A consistent daily typing practice routine leads to faster improvement than sporadic practice.",
  "Music can improve typing performance when it is instrumental and not overly distracting.",
  "Different keyboard layouts like Dvorak offer potential speed advantages but require significant relearning.",
  "Wrist position during typing is crucial for comfort, speed, and preventing long term injuries.",
  "The click sound of mechanical keyboards is preferred by many typists for tactile feedback.",
  "Silent keyboards offer advantages in quiet environments like libraries and office settings.",
  "Professional typists often customize their keyboards and settings to match their unique preferences.",
  "Typing accuracy is often valued more highly than speed in professional transcription work.",
  "The learning curve for typing is steep at first but rewards consistent practice with improvement.",
  "Developing muscle memory means your fingers can find keys without conscious thought or effort.",
  "Rhythm and pacing in typing contribute to both speed and accuracy in measurable ways.",
  "Typing tests online are free and accessible to anyone wanting to measure their skills.",
  "One hundred WPM is considered a respectable speed for professional typists in most fields.",
  "Typing competitions can offer significant prizes and recognition for top performing competitors.",
  "The future of typing may involve brain computer interfaces or other emerging technologies.",
  "Typing skills are foundational for success in many modern educational and professional environments.",
  "A typing class in school introduces students to the fundamentals of keyboard technique early on.",
  "Adults can learn to type efficiently even if they start later in life with dedicated practice.",
  "Typing speed plateaus are normal and can be overcome through targeted practice drills.",
  "The internet has made typing skills more important than ever for communication and work.",
  "Digital literacy and typing skills are increasingly essential for full participation in society.",
  "Typing errors decrease as focus and familiarity with the keyboard layout increase over time.",
  "A quiet environment is ideal for typing practice because it reduces cognitive load significantly.",
  "Typing is a core component of most office jobs in the modern business world.",
  "Remote work has increased the importance of typing skills for effective digital communication.",
  "Video conferences and chat applications rely on typing for text based communication daily.",
  "Email remains the primary written communication medium in most professional organizations.",
  "Typing fast allows you to capture ideas before they fade from your conscious mind.",
  "Journaling by hand is slower but can offer different cognitive benefits than typing on a keyboard.",
  "Handwriting recognition software is improving but still cannot match the speed of typing.",
  "Typing is more efficient than handwriting for most forms of long form content creation.",
  "Word processing software has revolutionized how we write and edit content in the digital age.",
  "Spell check and grammar tools complement typing skills but cannot replace good typing habits.",
  "Creative writing often flows more freely when using a keyboard than pen and paper.",
  "Programming requires typing speed but also demands accuracy and attention to syntax details.",
  "Code reviews often reveal typing mistakes that compile but produce incorrect program behavior.",
  "Debugging becomes easier when your code is well formatted and free from typing mistakes.",
  "Technical documentation requires clear writing which is best served by good typing practices.",
  "User experience designers often consider typing patterns when designing input interfaces.",
  "Accessibility features for typing help users with various physical and cognitive disabilities.",
  "Text to speech technology allows content to be consumed without relying on reading skills.",
  "Typing speed is less important than clear communication and effective message conveyance.",
  "Slow careful typing often produces fewer errors than rapid rushed typing sessions.",
  "Mindfulness while typing can improve both accuracy and the quality of written content.",
  "Taking breaks during typing prevents repetitive strain and maintains long term hand health.",
  "A strong typing habit turns small moments of practice into measurable progress over time.",
  "Short sessions repeated daily often create better results than occasional long practice marathons.",
  "Typing with rhythm helps your hands move smoothly while your mind stays focused on the text.",
  "Clear posture, relaxed shoulders, and steady breathing all support better typing endurance.",
  "A calm practice environment makes it easier to build accuracy before chasing speed.",
  "Every accurate repetition strengthens the connection between thought and keyboard movement.",
  "The best typists are not rushing constantly, but maintaining control through the whole sentence.",
  "Learning to recover from mistakes quickly is just as important as avoiding them in the first place.",
  "Reading ahead while typing can improve flow, but only when your accuracy stays steady.",
  "A deliberate pace at the beginning often creates faster results later in a typing session.",
  "Good typing practice should feel challenging, but never chaotic or impossible to follow.",
  "As confidence grows, your fingers can move with less hesitation and more natural rhythm.",
  "The keyboard becomes easier to trust when you practice with patience and consistency.",
  "Typing well is a practical skill, but it also rewards focus, discipline, and repetition.",
  "A few minutes of concentrated practice can be more valuable than a distracted hour.",
  "Modern work depends on fast communication, so typing remains a valuable everyday skill.",
  "When your hands stay relaxed, you can keep typing longer without losing accuracy.",
  "Good keyboard habits reduce strain and help you stay productive throughout the day.",
  "The more familiar a phrase becomes, the less effort it takes to enter it correctly.",
  "Typing practice improves when you pay attention to both accuracy and rhythm together."
];

const randomShuffleArray = (array) => {
  const shuffled = [...array];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIdx = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIdx]] = [shuffled[randomIdx], shuffled[index]];
  }
  return shuffled;
};

export const getRandomParagraph = () => {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * paragraphs.length);
  } while (randomIndex === lastParagraphIndex && paragraphs.length > 1);

  lastParagraphIndex = randomIndex;
  return paragraphs[randomIndex];
};

const cleanWord = (word) => word.toLowerCase().replace(/[^a-z0-9]/g, "");

const wordPool = paragraphs
  .join(" ")
  .split(/\s+/)
  .map(cleanWord)
  .filter(Boolean);

export const getRandomWordText = (wordCount) => {
  const shuffledPool = randomShuffleArray(wordPool);
  const words = shuffledPool.slice(0, wordCount);
  return words.join(" ");
};
