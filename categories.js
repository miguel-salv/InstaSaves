const categories = {
  "Food & Cooking": {
    keywords: [
      "recipe", "cook", "bake", "grill", "pan-fried", "food", "dish",
      "meal", "ingredient", "marinade", "kitchen", "cuisine",
      "dinner", "lunch", "breakfast", "air fryer", "homemade",
      "meal prep", "grocery", "menu", "weekly meal",
      "restaurant", "cafe", "dining", "eatery",
      "vegan", "vegetarian", "gluten-free", "halal", "kosher",
      "pizza", "burger", "sandwich", "salad", "soup", "dessert",
      "pasta", "rice", "noodles", "chicken", "beef", "pork",
      "fish", "seafood", "egg", "cheese", "milk", "yogurt",
      "butter", "oil", "salt", "pepper", "garlic", "onion",
      "tomato", "potato", "carrot", "broccoli", "cabbage",
      "onion", "garlic", "tomato", "potato", "carrot", "broccoli",
      "appetizer", "main course", "side dish", "dessert", "snack",
      "sous vide", "roast", "grill", "pan-fried", "air fryer",
      "oven", "stove", "microwave", "toaster", "blender", "juicer",
      "pressure cooker", "slow cooker", "instant pot"
    ]
  },

  "Home & Living": {
    keywords: [
      "decor", "deco","interior", "furniture",
      "declutter", "DIY", "room decor", "space planning", 
      "craft project", "handmade", "upcycle",
      "home decor", "homeware", "home improvement", "home renovation",
      "home design", "home staging", "home organization", "home cleaning",
      "home maintenance", "home repair", "home improvement", "home renovation",
      "home design", "home staging", "home organization", "home cleaning",
      "bedroom", "living room", "kitchen", "bathroom", "garden", "patio", "remodel",
      "house tour", "tiny house", "tiny home", "smart home"
    ]
  },

  "Fashion & Style": {
    keywords: [
      "outfit", "fashion", "clothing", "dress", 
      "accessory", "wardrobe", "haute couture", "grwm", 
      "get ready with me", "ootd", "style tip", "fashion advice", "how to wear",
      "clothes", "dress", "shirt", "pants", "shoes", "bag", "accessory",
      "jewelry", "watch", "belt", "scarf", "hat", "gloves", "socks", "underwear",
      "swimwear", "sportswear", "lookbook", "streetwear", "thrift", "sustainable fashion"
    ]
  },

  "Career & Professional": {
    keywords: [
      "career", "job", "professional", "personal branding", "side hustle",
      "job opening", "interview", "resume", "career fair",
      "office life", "team meeting", "corporate", "networking",
      "linkedin", "job search"
    ]
  },

  "Personal Growth": {
    keywords: [
      "self-improvement", "motivation", "mindset",
      "advice", "life lesson", "wisdom", "guide post",
      "productivity hack", "habit tracker", "routine", "organize day",
      "inspiration", "mindset shift",
      "journaling", "affirmation", "goal setting"
    ]
  },

  "Health & Wellness": {
    keywords: [
      "fitness", "workout", "exercise", "nutrition", "wellness", "health", 
      "skincare", "meditation", "yoga", "workout plan", 
      "gym", "HIIT", "mental health", "therapy insight", 
      "mindfulness", "self care", "nutrition tip", "healthy", "diet",
      "foam rolling", "stretching", "rehabilitation", "recovery", "rest",
      "intermittent fasting", "sleep"
    ]
  },

  "Technology": {
    keywords: [
      "tech", "software", "app", "computer", "coding", "gadget",
      "AI", "no-code", "cybersecurity", "plugin",
      "tech tip", "tutorial video", "how to code",
      "app review", "software demo", "platform overview",
      "device", "hardware review", "deep learning", "machine learning",
      "crypto", "blockchain", "web3", "NFT", "VSCode", "Claude", "ChatGPT",
      "Notion", "Google Docs", "Google Sheets", "Google Slides", "Google Docs",
      "Figma", "Canva", "Framer"
    ]
  },

  "Travel": {
    keywords: [
      "travel", "vacation", "destination", "adventure",
      "destination guide", "city review", "country spotlight", "place to visit",
      "packing list", "visa info", "itinerary tips", "budget travel",
      "road trip", "trek", "hike", "safari", "hotel", "airbnb", "backpacking", "hostel",
      "flight hack", "flight deal"
    ]
  },

  "Education": {
    keywords: [
      "study", "education", "academic", "school", "knowledge", "learning",
      "study routine", "learning hack", "note-taking", "academic success",
      "resource list", "material guide", "course portal", "tutorial blog",
      "practice skill", "masterclass", "skill building", "workshop", "studygram"
    ]
  },

  "Art & Creative": {
    keywords: [
      "art", "design", "drawing", "painting", "photography", "crafts", "3dprinting",
      "illustration", "canvas painting", "sketch art", "digital art",
      "photo shoot", "camera gear", "photography tip", "portrait",
      "craft DIY", "handmade", "upcycle project", "fiber art",
      "stop motion", "stop-motion", "stopmotion", "animation", "graphic design",
      "photography", "photo", "photoshop", "premiere pro", "after effects", "lightroom",
      "adobe", "blender", "procreate", "clip studio paint", "krita", "illustrator"
    ]
  },

  "Entertainment & Pop Culture": {
    keywords: [
      "movie", "tv show", "trailer", "fan art", "cosplay",
      "streaming", "celebrity", "gossip", "fan theory"
    ]
  },

  "Humor & Memes": {
    keywords: [
      "meme", "joke", "funny", "fails", "sketch",
      "viral meme", "duet", "stitch", "trend", "trending", "parody", "spoof"
    ]
  },

  "Beauty & Makeup": {
    keywords: [
      "makeup", "skincare", "beauty hack", "contour", "swatch",
      "swatches", "hair", "haircare"
    ]
  },

  "Pets & Animals": {
    keywords: [
      "puppy", "kitten", "rescue", "adoption", "wildlife", "doggo", "meow", "pet",
      "dog", "cat", "bird", "fish", "rabbit", "hamster", "guinea pig", "turtle"
    ]
  },

  "Music & Dance": {
    keywords: [
      "cover", "choreography", "dance challenge", "beat", "guitar", "piano",
      "beat making", "fl studio", "logic pro", "pro tools", "ableton",
      "hip hop", "hip-hop", "rap", "edm", "trap", "house", "techno", "dubstep", "trance",
      "pop", "rock", "jazz", "blues", "country", "folk", "classical", "r&b", "soul", "DJ", "radio"
    ]
  },

  "Gaming & eSports": {
    keywords: [
      "gameplay", "walkthrough", "speedrun", "eSports", "streamer", "gaming", 
      "tutorial", "highlight", "tournament", "guide", "PS5", "Xbox", "Nintendo",
      "esports", "streamer", "gaming", "game"
    ]
  },

  "Finance & Money": {
    keywords: [
      "investing", "crypto", "stocks", "budgeting", "side hustle", 
      "finance", "money hack", "saving", "stock market", "stock", "invest",
      "ETF", "mutual fund", "crypto", "401k", "IRA", "RRSP", "TFSA", "HSA", "HIPAA",
      "fidelity", "robinhood", "etoro", "vanguard", "sp500", "nasdaq", "dow jones",
      "tax", "taxes", "debt", "real estate", "property", "rent", "rental", "mortgage"
    ]
  },

  "Parenting & Family": {
    keywords: [
      "mom life", "dad hack", "toddler", "newborn", "family vlog", "parent tip",
      "newborn", "baby", "child", "teen", "teenager", "back to school", "parenting"
    ]
  },

  "Automotive & Transport": {
    keywords: [
      "car", "road trip", "EV", "supercar", "automotive",
      "test drive", "mod build", "tesla", "toyota", "ford",
      "honda", "nissan", "hyundai", "kia", "volkswagen", "mercedes",
      "bmw", "audi", "lexus", "infiniti", "subaru", "mazda",
      "brakes", "suspension", "engine", "transmission", "tire", "wheel"
    ]
  }
};

// Text analysis function
function analyzePostContent(post) {
  const textToAnalyze = [
    post.caption,
    ...post.tags,
    ...(post.collections ? post.collections.map(c => c.name) : [])
  ].join(' ').toLowerCase();

  return Object.entries(categories)
    .filter(([categoryName, categoryData]) => {
      return categoryData.keywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        return regex.test(textToAnalyze);
      });
    })
    .map(([categoryName]) => categoryName);
}