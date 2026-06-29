const SLUG = process.env.DEV_TENANT || 'vrfitness';

const FITNESS_CARDS = [
  { id: 1, title: 'Morning HIIT',     time: '6:00 AM',  trainer: 'Trainer1', spots: 8,  emoji: '🔥' },
  { id: 2, title: 'Evening Yoga',      time: '6:00 PM',  trainer: 'Trainer2', spots: 12, emoji: '🧘' },
  { id: 3, title: 'Strength Basics',   time: '7:00 AM',  trainer: 'Trainer1', spots: 6,  emoji: '💪' },
  { id: 4, title: 'Zumba Friday',      time: '5:00 PM',  trainer: 'Trainer2', spots: 15, emoji: '💃' },
];

export default function Home() {
  const cards = SLUG === 'spicegarden'
    ? [
        { id: 1, title: 'Reserve a Table', time: 'Tonight 7pm',  emoji: '🍽️' },
        { id: 2, title: 'Order Delivery',  time: '30 min',       emoji: '🛵' },
        { id: 3, title: 'Today\u2019s Special', time: 'Until 9pm', emoji: '⭐' },
      ]
    : FITNESS_CARDS;

  return (
    <div>
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white px-6 py-8">
        <div className="text-sm opacity-80">Welcome back</div>
        <div className="text-2xl font-bold">Hi Member</div>
        <div className="text-sm opacity-80 mt-1">tenant: {SLUG}</div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {cards.map((c: any) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{c.emoji}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{c.title}</div>
                <div className="text-xs text-gray-500 mt-1">{c.time}{c.trainer ? ` · ${c.trainer}` : ''}</div>
                {c.spots && <div className="text-xs text-emerald-600 mt-1">{c.spots} spots available</div>}
              </div>
            </div>
            <button className="mt-3 w-full py-2 bg-slate-900 text-white text-sm rounded-md">Book</button>
          </div>
        ))}
      </div>
    </div>
  );
}
