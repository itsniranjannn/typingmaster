export const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "Life is what happens when you're busy making other plans. - John Lennon",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Do what you can, with what you have, where you are. - Theodore Roosevelt",
  "In the middle of every difficulty lies opportunity. - Albert Einstein",
  "Be yourself; everyone else is already taken. - Oscar Wilde",
  "If you tell the truth, you don't have to remember anything. - Mark Twain",
  "Not all those who wander are lost. - J.R.R. Tolkien",
  "The journey of a thousand miles begins with one step. - Lao Tzu",
  "Well done is better than well said. - Benjamin Franklin",
  "Happiness depends upon ourselves. - Aristotle",
  "Turn your wounds into wisdom. - Oprah Winfrey",
  "Stay hungry, stay foolish. - Steve Jobs",
  "What we think, we become. - Buddha",
  "Simplicity is the ultimate sophistication. - Leonardo da Vinci",
  "If you can dream it, you can do it. - Walt Disney",
  "Do the hard jobs first. The easy jobs will take care of themselves. - Dale Carnegie",
  "Quality is not an act, it is a habit. - Aristotle",
  "Great things are done by a series of small things brought together. - Vincent van Gogh",
  "The expert in anything was once a beginner. - Helen Hayes",
  "Motivation gets you started. Habit keeps you going. - Jim Ryun",
  "It always seems impossible until it's done. - Nelson Mandela",
  "You miss 100 percent of the shots you don't take. - Wayne Gretzky",
  "A well-typed sentence is a small act of craftsmanship. - TypeMaster"
];

export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

export const fetchRemoteQuote = async () => {
  try {
    const resp = await fetch("https://api.quotable.io/random");
    if (!resp.ok) throw new Error("network");
    const data = await resp.json();
    if (data && data.content) {
      return `${data.content} - ${data.author || "Unknown"}`;
    }
  } catch (e) {
    // ignore and fall back to local quotes
  }
  return getRandomQuote();
};
