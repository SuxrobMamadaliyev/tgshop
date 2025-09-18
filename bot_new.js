const { Telegraf, Markup, session } = require('telegraf');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds
const RATE_LIMIT_MAX = 3; // Max messages per window

// Function to check rate limit
function checkRateLimit(userId) {
  const now = Date.now();
  const userTimestamps = rateLimit.get(userId) || [];
  
  // Remove timestamps older than the current window
  const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Check if user is over the limit
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }
  
  // Add current timestamp and update the map
  recentTimestamps.push(now);
  rateLimit.set(userId, recentTimestamps);
  return true; // Not rate limited
}

// Function to escape MarkdownV2 special characters
function escapeMarkdownV2(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-={}.!]/g, '\\$&');
}

// Define the path to the menu image
const MENU_IMAGE = path.join(__dirname, 'menu.jpg');

// Botni yaratamiz
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware to check rate limit and channel subscription
bot.use(async (ctx, next) => {
  try {
    // Skip if it's not a message or doesn't have a user ID
    if (!ctx.message || !ctx.from) return next();
    
    const userId = ctx.from.id;
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return; // Skip processing this message
    }
    
    // List of required channels (add your channel usernames here)
    const requiredChannels = ['HOLYUCSERVIS', 'starschatim'];
    
    // Check channel subscription
    for (const channel of requiredChannels) {
      try {
        const member = await ctx.telegram.getChatMember(`@${channel}`, userId);
        if (member.status === 'left' || member.status === 'kicked') {
          console.log(`User ${userId} is not subscribed to @${channel}`);
          await ctx.reply(`Iltimos, avval @${channel} kanaliga obuna bo'ling !`);
          return; // Skip processing if not subscribed
        }
      } catch (error) {
        console.error(`Error checking subscription to @${channel}:`, error);
      }
    }
    
    // Continue to the next middleware/handler
    return next();
  } catch (error) {
    console.error('Middleware error:', error);
    return next(); // Continue to next middleware even if there's an error
  }
});

// Global variables for user data
if (!global.referrals) {
  global.referrals = {}; // Store referral data
}
if (!global.existingUsers) {
  global.existingUsers = new Set(); // Track existing users
}

// Foydalanuvchilar ma'lumotlarini yuklash
function loadUsers() {
  try {
    if (fs.existsSync('users.json')) {
      const data = fs.readFileSync('users.json', 'utf8');
      const users = JSON.parse(data || '{}');
      console.log(`Loaded ${Object.keys(users).length} users`);
      return users;
    }
    return {};
  } catch (error) {
    console.error('Error loading users:', error);
    return {};
  }
}

// Foydalanuvchilar ma'lumotlarini saqlash
function saveUsers(users) {
  try {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Foydalanuvchi ma'lumotlarini saqlash funksiyasi
function saveUserInfo(userData) {
  try {
    const userId = userData.id.toString();
    
    if (!users[userId]) {
      users[userId] = {
        id: userData.id,
        username: userData.username || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        language_code: userData.language_code || '',
        is_bot: userData.is_bot || false,
        join_date: new Date().toISOString(),
        balance: 0, // Yangi foydalanuvchiga 0 balans
        last_updated: new Date().toISOString()
      };
    } else {
      // Faqat o'zgarishi mumkin bo'lgan ma'lumotlarni yangilaymiz
      users[userId].username = userData.username || users[userId].username || '';
      users[userId].first_name = userData.first_name || users[userId].first_name || '';
      users[userId].last_name = userData.last_name || users[userId].last_name || '';
      users[userId].language_code = userData.language_code || users[userId].language_code || '';
      users[userId].last_seen = new Date().toISOString();
      
      // Agar balans mavjud bo'lmasa, 0 qilib qo'yamiz
      if (typeof users[userId].balance === 'undefined') {
        users[userId].balance = 0;
      }
    }
    
    // Har safar faylga yozamiz
    saveUsers(users);
    
    return users[userId];
  } catch (error) {
    console.error('Error saving user info:', error);
    return null;
  }
}

// Dastur ishga tushganda foydalanuvchilarni yuklash
const users = loadUsers();

// Har 1 daqiqada foydalanuvchilarni saqlash
setInterval(() => {
  try {
    const currentUsers = loadUsers();
    // Faqat yangi o'zgarishlarni saqlash
    saveUsers({...currentUsers, ...users});
  } catch (error) {
    console.error('Error in auto-save:', error);
  }
}, 60 * 1000);

// Dastur to'xtatilganda foydalanuvchilarni saqlash
process.on('SIGINT', () => {
  saveUsers(users);
  process.exit();
});

// --- Almaz narxlari ---
const ALMAZ_PRICES = {
  '100+80': 14000,       // 100 + 80 diamantes
  '310+249': 41000,      // 310 + 249 diamantes
  '520+416': 72000,      // 520 + 416 diamantes
  '1060+848': 144000,    // 1060 + 848 diamantes
  '2180+1853': 274000,   // 2180 + 1853 diamantes
  '5600+4760': 719000    // 5600 + 4760 diamantes
};

// --- PUBG Mobile UC narxlari (kengaytirilgan) ---
const UC_PRICES = {
  '60': 12000,
  '120': 24000,
  '180': 36000,
  '325': 58000,
  '385': 70000,
  '445': 82000,
  '660': 114000,
  '720': 125000,
  '985': 170000,
  '1320': 228000,
  '1800': 285000,
  '2125': 345000,
  '2460': 400000,
  '2785': 460000,
  '3850': 555000,
  '4175': 610000,
  '4510': 670000,
  '5650': 855000,
  '8100': 1100000,
  '9900': 1385000,
  '11950': 1660000,
  '16200': 2200000
};

// --- PUBG Mobile PP narxlari (kengaytirilgan) ---
const PP_PRICES = {
  '1000': 2520,
  '3000': 7560,
  '5000': 12600,
  '10000': 25200,
  '20000': 50400,
  '50000': 116676,
  '100000': 235242
};

// Session middleware barcha sozlamalar uchun
bot.use(session({
  defaultSession: () => ({
    // Almaz sotib olish uchun
    almax: { step: null, amount: null },
    // Balans to'ldirish uchun
    topup: { step: null, amount: null },
    // Buyurtma uchun
    buying: null,
    // Promokodlar uchun
    awaitingPromo: false,
    awaitingNewPromo: false,
    awaitingFindUser: false,
    awaitingBroadcast: false
  })
}));

// --- Almaz sotib olish bosqichlari ---
bot.action('buy:almaz', async (ctx) => {
  ctx.session.almaz = { step: 'amount' };
  
  // Create buttons for each diamond package
  const keyboard = [];
  
  // Add buttons for each diamond package in ALMAZ_PRICES
  for (const [packageName, price] of Object.entries(ALMAZ_PRICES)) {
    keyboard.push([
      Markup.button.callback(
        `${packageName} Almaz - ${price.toLocaleString()} so'm`,
        `almaz:amount:${packageName}`
      )
    ]);
  }
  
  // Add back button
  keyboard.push([Markup.button.callback('⬅️ Orqaga', 'back:main')]);
  
  await sendOrUpdateMenu(ctx, 'Qancha Almaz sotib olmoqchisiz?', keyboard);
});

bot.action(/almaz:amount:(.+)/, async (ctx) => {
  const packageName = ctx.match[1];
  const userId = ctx.from.id;
  const price = ALMAZ_PRICES[packageName];
  
  if (!price) {
    await ctx.answerCbQuery('❌ Xatolik: Bunday paket topilmadi');
    return;
  }
  
  const userBalance = getUserBalance(userId);
  if (userBalance < price) {
    await sendOrUpdateMenu(
      ctx,
      `❌ Mablag' yetarli emas!\n\n💳 Balans: ${userBalance.toLocaleString()} so'm\n💰 Kerak: ${price.toLocaleString()} so'm\n\nBalansingizni to'ldiring va qayta urinib ko'ring.`,
      [
        [Markup.button.callback('💳 Balansni to\'ldirish', 'topup:amount')],
        [Markup.button.callback('⬅️ Orqaga', 'back:main')]
      ]
    );
    delete ctx.session.almaz;
    return;
  }
  
  ctx.session.almaz = { step: 'uid', amount: packageName, price };
  await sendOrUpdateMenu(ctx, `Free Fire ID raqamingizni kiriting:\n\nMasalan: 123456789`, [
    [Markup.button.callback('⬅️ Orqaga', 'back:main')]
  ]);
});

// UID va balans tekshirish
bot.on('text', async (ctx, next) => {
  if (ctx.session.almaz && ctx.session.almaz.step === 'uid') {
    const uid = ctx.message.text.trim();
    const amount = ctx.session.almaz.amount;
    const price = ctx.session.almaz.price;
    const userId = ctx.from.id;
    
    if (!/^[0-9]{5,}$/.test(uid)) {
      await ctx.reply('❌ Iltimos, to\'g\'ri Free Fire ID raqamini kiriting!');
      return;
    }
    
    // Adminlarga buyurtma yuborish
    const orderId = generateOrderId();
    ctx.session.almaz = undefined;
    
    // Store order in global orders
    if (!global.orders) global.orders = {};
    global.orders[orderId] = { 
      userId, 
      type: 'almaz', 
      amount, 
      uid, 
      price,
      userName: ctx.from.first_name,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    const adminMessage = `💎 *Yangi Almaz buyurtma*\n` +
      `🆔 Buyurtma ID: ${orderId}\n` +
      `💎 Miqdor: ${amount} Almaz\n` +
      `🎮 UID: ${uid}\n` +
      `💰 Summa: ${price.toLocaleString()} so'm\n` +
      `👤 Foydalanuvchi: ${ctx.from.username || ctx.from.first_name || userId} (ID: ${userId})`;
    
    const adminKeyboard = [
      [
        Markup.button.callback('✅ Tasdiqlash', `confirm_almaz:${orderId}`),
        Markup.button.callback('❌ Bekor qilish', `cancel_order:${orderId}`)
      ]
    ];
    
    for (const adminId of ADMIN_IDS) {
      try {
        await ctx.telegram.sendMessage(
          adminId,
          adminMessage,
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: adminKeyboard } }
        );
      } catch (e) {
        console.error(`Admin ${adminId} ga xabar yuborishda xatolik:`, e);
      }
    }
    
    await ctx.reply(`✅ Buyurtmangiz qabul qilindi!\n\n💎 Miqdor: ${amount} Almaz\n🎮 UID: ${uid}\n💰 Summa: ${price.toLocaleString()} so'm\n\nTez orada admin tasdiqlaydi.`);
    return;
  }
  return next();
});

// Admin tasdiqlasa balansdan pul yechish
bot.action(/confirm_almaz:(\w+)/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCbQuery('Ruxsat yo\'q!');
    return;
  }
  const orderId = ctx.match[1];
  const order = global.orders && global.orders[orderId];
  
  if (!order || order.type !== 'almaz') {
    await ctx.answerCbQuery('Buyurtma topilmadi!');
    return;
  }
  
  const { userId, amount, uid, price } = order;
  const userBalance = getUserBalance(userId);
  
  if (userBalance < price) {
    await ctx.reply(`❌ Foydalanuvchida yetarli mablag' yo'q. Balans: ${userBalance.toLocaleString()} so'm, kerak: ${price.toLocaleString()} so'm`);
    return;
  }
  
  updateUserBalance(userId, -price);
  
  // Update order status
  if (global.orders[orderId]) {
    global.orders[orderId].status = 'completed';
    global.orders[orderId].completedAt = new Date().toISOString();
    global.orders[orderId].completedBy = ctx.from.id;
  }
  
  await ctx.answerCbQuery('✅ Buyurtma tasdiqlandi!');
  await ctx.editMessageText(`${ctx.update.callback_query.message.text}\n\n✅ *Tasdiqlandi*`);
  
  try {
    await ctx.telegram.sendMessage(
      userId,
      `✅ Buyurtmangiz tasdiqlandi!\n\n💎 ${amount} Almaz tez orada UID: ${uid} ga tushiriladi.`
    );
  } catch (e) {
    console.error('Foydalanuvchiga xabar yuborishda xatolik:', e);
  }
});

// Kanal ma'lumotlari
const CHANNELS = [
  {
    username: process.env.CHANNEL_1_USERNAME?.replace('@', '') || 'channel1',
    link: process.env.CHANNEL_1_LINK || 'https://t.me/channel1'
  },
  {
    username: process.env.CHANNEL_2_USERNAME?.replace('@', '') || 'channel2',
    link: process.env.CHANNEL_2_LINK || 'https://t.me/channel2'
  }
];

// Xabarlarni boshqarish uchun asosiy funksiya
async function sendOrUpdateMenu(ctx, caption, keyboard) {
  const greeting = `Assalomu alaykum, ${ctx.from?.first_name || 'foydalanuvchi'}!\n\n`;
  
  try {
    // Loading animatsiyasini to'xtatish
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery();
      } catch (e) {
        console.log('answerCbQuery xatoligi:', e.message);
      }
      
      // Agar asosiy menyu bo'lsa
      if (caption === 'Bo\'limni tanlang:') {
        try {
          // Avvalgi xabarni o'chirishga harakat qilamiz
          try {
            await ctx.deleteMessage();
          } catch (e) {
            console.log('Xabarni o\'chirib bo\'lmadi, yangi xabar yuborilmoqda...');
          }
          
          // Rasm bilan yangi xabar yuborishga harakat qilamiz
          try {
            const absolutePath = path.resolve(MENU_IMAGE);
            console.log('Trying to send image from:', absolutePath);
            
            if (!fs.existsSync(absolutePath)) {
              console.error('Rasm fayli topilmadi:', absolutePath);
              throw new Error(`Rasm fayli topilmadi: ${absolutePath}`);
            }
            
            console.log('Rasm fayli mavjud, yuborilmoqda...');
            
            try {
              console.log('Attempting to send photo...');
              await ctx.replyWithPhoto(
                { source: fs.createReadStream(absolutePath) },
                {
                  caption: greeting + caption,
                  ...Markup.inlineKeyboard(keyboard),
                  parse_mode: 'Markdown'
                }
              );
              console.log('Rasm muvaffaqiyatli yuborildi');
              return;
            } catch (sendError) {
              console.error('Error sending photo:', sendError);
              throw sendError;
            }
          } catch (photoError) {
            console.error('Rasm bilan xabar yuborishda xatolik:', photoError);
            await ctx.reply(greeting + caption, {
              ...Markup.inlineKeyboard(keyboard),
              parse_mode: 'Markdown'
            });
          }
        } catch (error) {
          console.error('Asosiy menyu yuborishda xatolik:', error);
          try {
            await ctx.reply(greeting + caption, {
              ...Markup.inlineKeyboard(keyboard),
              parse_mode: 'Markdown'
            });
          } catch (e) {
            console.error('Alternativ xabar yuborishda xatolik:', e);
          }
        }
      } else {
        // Try to handle message editing or sending new message
        const message = ctx.callbackQuery?.message;
        const messageId = message?.message_id;
        const chatId = ctx.chat?.id || message?.chat?.id;
        
        const canEditMessage = messageId && chatId && 
                             (message?.text || message?.caption) && 
                             !message?.photo;
        
        if (canEditMessage) {
          try {
            await ctx.telegram.editMessageText(
              chatId,
              messageId,
              null,
              caption,
              {
                reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
                parse_mode: 'Markdown'
              }
            );
            return;
          } catch (editError) {
            console.error('Xabarni tahrirlashda xatolik:', editError.message);
          }
        }
        
        try {
          if (messageId) {
            try { 
              await ctx.telegram.deleteMessage(chatId, messageId);
            } catch (deleteError) {
              console.log('Eski xabarni o\'chirib bo\'lmadi:', deleteError.message);
            }
          }
          
          try {
            await ctx.reply(caption, {
              reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
              parse_mode: 'Markdown'
            });
          } catch (replyError) {
            console.error('Formatlangan xabar yuborishda xatolik:', replyError);
            
            try {
              await ctx.reply(caption, Markup.inlineKeyboard(keyboard));
            } catch (simpleError) {
              console.error('Oddiy xabar yuborishda ham xatolik:', simpleError);
              
              try {
                await ctx.reply(caption);
              } catch (finalError) {
                console.error('Faqat matn yuborishda ham xatolik:', finalError);
              }
            }
          }
        } catch (mainError) {
          console.error('Xabar yuborishda asosiy xatolik:', mainError);
        }
      }
    } else {
      // Yangi suhbat boshlanganda
      if (caption === 'Bo\'limni tanlang:') {
        try {
          const greeting = `Assalomu alaykum, ${ctx.from.first_name || 'foydalanuvchi'}!\n\n`;
          const absolutePath = path.resolve(MENU_IMAGE);
          console.log('Trying to send image from (second instance):', absolutePath);
          
          if (!fs.existsSync(absolutePath)) {
            console.error('Rasm fayli topilmadi (second instance):', absolutePath);
            throw new Error(`Rasm fayli topilmadi: ${absolutePath}`);
          }
          
          console.log('Rasm fayli mavjud, yuborilmoqda (second instance)...');
          
          try {
            await ctx.replyWithPhoto(
              { source: absolutePath },
              {
                caption: greeting + caption,
                ...Markup.inlineKeyboard(keyboard),
                parse_mode: 'Markdown'
              }
            );
          } catch (error) {
            console.error('Rasm yuborishda xatolik (second instance):', error);
            throw error;
          }
        } catch (error) {
          console.error('Rasm yuklanmadi:', error);
          await ctx.reply(caption, Markup.inlineKeyboard(keyboard));
        }
      } else {
        await ctx.reply(caption, Markup.inlineKeyboard(keyboard));
      }
    }
  } catch (error) {
    console.error('Xatolik yuz berdi:', error);
    try {
      await ctx.reply(caption);
    } catch (e) {
      console.error('Xabar yuborib bo\'lmadi:', e);
    }
  }
}

// Asosiy menyuda ko'rinadigan tugmalar nomlari
const MAIN_MENU = [
  'Hisobim',
  'TG Premium & Stars',
  'Free Fire Almaz', // Yangi qo'shildi
  'PUBG Mobile UC / PP',
  'UC Shop',
  'SOS',
  'Promokod',
  'Admen paneli',
];

// User balances and referral system are now initialized at the top of the file

// /start yoki asosiy menyu ko'rsatish
async function sendMainMenu(ctx) {
  // Asosiy menyu tugmalarini yaratamiz
  try {
    // Avval obunani tekshirish
    const checkResult = await checkUserSubscription(ctx);
    
    // Agar obuna bo'lmagan bo'lsa yoki bot kanalga kira olmasa, obuna bo'lish sahifasiga yo'naltiramiz
    if (!checkResult.subscribed || checkResult.hasAccessError) {
      return await sendSubscriptionMessage(ctx, checkResult);
    }
    
    // Agar obuna bo'lgan bo'lsa, asosiy menyuni ko'rsatamiz
    const menuItems = [...MAIN_MENU];
  
    // Admin panelini faqat adminlar uchun ko'rsatamiz
    if (!isAdmin(ctx)) {
      const adminIndex = menuItems.indexOf('Admen paneli');
      if (adminIndex > -1) {
        menuItems.splice(adminIndex, 1);
      }
    }
    
    const keyboard = menuItems.map((text) => {
      if (text === 'UC Shop') {
        return [Markup.button.url(text, UC_CHANNEL_URL)];
      }
      return [Markup.button.callback(text, `menu:${text}`)];
    });
    
    // Always send a new message instead of editing to avoid message editing issues
    try {
      try {
        if (ctx.callbackQuery) {
          await ctx.deleteMessage();
        }
      } catch (e) {
      }
      
      // Send menu image with the main menu
      try {
        await ctx.replyWithPhoto({
          source: fs.createReadStream(MENU_IMAGE)
        }, {
          caption: 'Bo\'limni tanlang:',
          reply_markup: {
            inline_keyboard: keyboard
          },
          parse_mode: 'Markdown'
        });
      } catch (photoError) {
        console.error('Rasm yuborishda xatolik:', photoError);
        await ctx.reply('Bo\'limni tanlang:', {
          reply_markup: {
            inline_keyboard: keyboard
          },
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Error sending main menu:', error);
      await ctx.reply('Iltimos, asosiy menyuni qayta yuklash uchun /start buyrug\'ini bosing.');
    }
  } catch (error) {
    console.error('sendMainMenu xatosi:', error);
    await ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
  }
};

bot.start((ctx) => {
  try {
    if (ctx.from && ctx.from.id) {
      global.botUsers.add(ctx.from.id);
      saveUserInfo(ctx.from);
    }
    
    handleReferral(ctx);
    sendMainMenu(ctx);
  } catch (error) {
    console.error('Error in start command:', error);
    ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
  }
});

// Inline tugma bosilganda
bot.action(/menu:(.+)/, async (ctx) => {
  const selection = ctx.match[1];

  switch (selection) {
    case 'Hisobim':
      await sendAccountMenu(ctx);
      break;
    case 'TG Premium & Stars':
      const mainKeyboard = [
        [Markup.button.callback('📱 Telegram Premium', 'premium:select')],
        [Markup.button.callback('⭐ Telegram Stars', 'stars:select')],
        [Markup.button.callback('⬅️ Orqaga', 'back:main')]
      ];
      await sendOrUpdateMenu(ctx, 'Qaysi xizmatni sotib olmoqchisiz?', mainKeyboard);
      break;
    case 'Free Fire Almaz': {
      await ctx.answerCbQuery();
      const keyboard = [
        [Markup.button.callback('💎 Almaz sotib olish', 'buy:almaz')],
        [Markup.button.callback('⬅️ Orqaga', 'back:main')]
      ];
      await sendOrUpdateMenu(ctx, "💎 Almaz sotib olish bo'limi:", keyboard);
      break;
    }
    case 'PUBG Mobile UC / PP': {
      await ctx.answerCbQuery();
      const keyboard = [
        [Markup.button.callback('UC sotib olish', 'pubg:buy_uc')],
        [Markup.button.callback('PP sotib olish', 'pubg:buy_pp')],
        [Markup.button.callback('⬅️ Orqaga', 'back:main')]
      ];
      await sendOrUpdateMenu(ctx, "PUBG Mobile UC / PP bo'limi:", keyboard);
      break;
    }
    case 'UC Shop':
      await sendUCShop(ctx);
      break;
    case 'SOS':
      await sendSOS(ctx);
      break;
    case 'Promokod':
      await promptPromokod(ctx);
      break;
    case 'Admen paneli':
      if (isAdmin(ctx)) {
        await sendAdminPanel(ctx);
      } else {
        await ctx.answerCbQuery('Ruxsat yo\'q!');
      }
      break;
    default:
      await ctx.answerCbQuery('Ushbu bo\'lim hozircha mavjud emas');
  }
});
