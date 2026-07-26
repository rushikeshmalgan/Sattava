import { CoachType } from '../components/CoachSelectionModal';

export type NotificationTriggerType = 
    | 'overeating' 
    | 'water' 
    | 'streak' 
    | 'missionPending' 
    | 'rewardUnlocked' 
    | 'positiveLog';

interface CoachMessage {
    title: string;
    body: string;
}

export function getCoachMessage(trigger: NotificationTriggerType, coachType: CoachType | null = 'Friendly'): CoachMessage {
    const tone = coachType || 'Friendly';

    const messages: Record<NotificationTriggerType, Record<CoachType, CoachMessage[]>> = {
        overeating: {
            Strict: [
                { title: 'Discipline Alert 🚨', body: 'That was a massive meal. One more like that and your week is ruined. Balance it now.' },
                { title: 'Watch the Portions 🛑', body: 'Calories don\'t lie even if you do. This log is too high. Get back on track.' }
            ],
            Neutral: [
                { title: 'High Calorie Log', body: 'This entry exceeds 1200 kcal. Please ensure this data is accurate.' }
            ],
            Friendly: [
                { title: 'Big Meal! 🥗', body: 'Looks like a hearty one! Try a light walk to help with digestion.' }
            ]
        },
        water: {
            Strict: [
                { title: 'Hydrate or Fail 💧', body: 'Your brain is 75% water. Act like it. Drink 500ml now.' },
                { title: 'Water Deficit ⚠️', body: 'You are falling behind. Discipline includes hydration. Drink up.' }
            ],
            Neutral: [
                { title: 'Water Reminder', body: 'It is time to consume more water to meet your daily goal.' }
            ],
            Friendly: [
                { title: 'Time for Water! 🚰', body: 'Don\'t forget to stay hydrated! Your body will thank you.' }
            ]
        },
        streak: {
            Strict: [
                { title: 'Don\'t be a Quitter 🔥', body: 'Your streak is at risk. 5 days of work gone in 1 hour if you don\'t log now.' },
                { title: 'Streak Danger ⚠️', body: 'Zero logs detected. Are you giving up already? Log a meal.' }
            ],
            Neutral: [
                { title: 'Pending Logs', body: 'You have not logged anything today. Maintain your streak.' }
            ],
            Friendly: [
                { title: 'Keep the Fire Going! 🔥', body: 'Don\'t break your beautiful streak today! Just a quick log?' }
            ]
        },
        missionPending: {
            Strict: [
                { title: 'Finish the Job ❌', body: 'Missions are still pending. Excellence is a habit, not an act. Finish them.' }
            ],
            Neutral: [
                { title: 'Daily Missions Status', body: 'Your daily missions are currently incomplete.' }
            ],
            Friendly: [
                { title: 'Almost There! 🌟', body: 'You still have a few missions pending. You\'re doing great!' }
            ]
        },
        rewardUnlocked: {
            Strict: [
                { title: 'Efficiency Recognized 🏆', body: 'Milestone hit. Don\'t get complacent. The next one is harder.' }
            ],
            Neutral: [
                { title: 'Milestone Reached', body: 'A new reward has been unlocked in your achievements.' }
            ],
            Friendly: [
                { title: '🎁 Surprise for You!', body: 'Incredible work! You\'ve unlocked a new achievement. So proud!' }
            ]
        },
        positiveLog: {
            Strict: [
                { title: 'Discipline Maintained.', body: 'High protein, correct calories. This is how you win.' }
            ],
            Neutral: [
                { title: 'Log Successful', body: 'High protein meal recorded.' }
            ],
            Friendly: [
                { title: 'Nice Choice! 💪', body: 'That\'s a great, high-protein meal! Keep it up!' }
            ]
        }
    };

    const triggerMessages = messages[trigger] || { Friendly: [{ title: 'Update', body: 'Check your progress.' }] };
    const toneMessages = (triggerMessages as any)[tone] || triggerMessages.Friendly;
    
    // Pick a random message from the pool for variety (Variable Reward)
    return toneMessages[Math.floor(Math.random() * toneMessages.length)];
}
