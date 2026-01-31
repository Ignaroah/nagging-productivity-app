import { ScheduleChunk } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Cheeky notification messages based on progress through the task
const getNagMessage = (taskTitle: string, progress: number): { title: string; body: string } => {
  // Progress: 0-1 (0% to 100%)

  if (progress < 0.25) {
    // Early stage (0-25%)
    const early = [
      { title: "Just getting started?", body: `${taskTitle} - You've barely scratched the surface! Let's gooo!` },
      { title: "Wakey wakey!", body: `${taskTitle} is calling... and it sounds impatient! 😤` },
      { title: "Ahem... 👀", body: `${taskTitle} won't finish itself. No pressure though... 🙃` },
      { title: "Still there?", body: `${taskTitle} is looking at you like 👁️👄👁️` },
      { title: "Yoo-hoo! 👋", body: `${taskTitle} is feeling neglected. Show it some love!` }
    ];
    return early[Math.floor(Math.random() * early.length)];
  } else if (progress < 0.5) {
    // Quarter-way through (25-50%)
    const quarter = [
      { title: "Quarter of the way there!", body: `${taskTitle} - Looking good so far! Keep the momentum! 💪` },
      { title: "Making progress!", body: `${taskTitle} - You're on a roll... don't stop now! 🔥` },
      { title: "You're doing it!", body: `${taskTitle} - Past the awkward start phase. It's smooth sailing now!` },
      { title: "Momentum check!", body: `${taskTitle} - You started strong! Let's finish stronger! 🚀` },
      { title: "Nice pace!", body: `${taskTitle} - Keep this up and you'll be done before you know it!` }
    ];
    return quarter[Math.floor(Math.random() * quarter.length)];
  } else if (progress < 0.75) {
    // Halfway through (50-75%)
    const half = [
      { title: "Halfway there! 🎉", body: `${taskTitle} - You're crushing it! Don't give up now!` },
      { title: "The home stretch!", body: `${taskTitle} - So close you can taste it! Keep going! 🏃` },
      { title: "Past the halfway mark!", body: `${taskTitle} - It's all downhill from here! (in a good way) 📉✨` },
      { title: "You're unstoppable!", body: `${taskTitle} - Giving up now would be silly. You're SO close! 💫` },
      { title: "Look at you go!", body: `${taskTitle} - More than halfway done! Finish strong! 💪` }
    ];
    return half[Math.floor(Math.random() * half.length)];
  } else {
    // Final stretch (75-100%)
    const final = [
      { title: "Almost there!", body: `${taskTitle} - You can see the finish line! Sprint! 🏁` },
      { title: "SO CLOSE!", body: `${taskTitle} - Just a little more... you've got this! 🎯` },
      { title: "Final push!", body: `${taskTitle} - Don't stop now! Victory is near! 🏆` },
      { title: "Nearly done!", body: `${taskTitle} - The end is in sight! Finish like a champion! ⭐` },
      { title: "Last lap!", body: `${taskTitle} - You didn't come this far to only come this far! 🚀` }
    ];
    return final[Math.floor(Math.random() * final.length)];
  }
};

interface NotificationInfo {
  nextNotificationAt: Date | null;
  allNotifications: Date[];
}

let activeCleanupFunction: (() => void) | null = null;

export function startChunkNagging(
  chunk: ScheduleChunk,
  onChunkEnd: () => void
): { cleanup: () => void; info: NotificationInfo } {
  // Clear any existing notifications first
  if (activeCleanupFunction) {
    activeCleanupFunction();
    activeCleanupFunction = null;
  }

  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const allNotificationTimes: Date[] = [];
  const now = new Date();

  // Parse chunk times
  const [hours, minutes] = chunk.startTime.split(':').map(Number);
  const chunkStart = new Date(now);
  chunkStart.setHours(hours, minutes, 0, 0);

  const [endHours, endMinutes] = chunk.endTime.split(':').map(Number);
  const chunkEnd = new Date(now);
  chunkEnd.setHours(endHours, endMinutes, 0, 0);

  // If chunk already ended, don't schedule anything
  if (now.getTime() > chunkEnd.getTime()) {
    return {
      cleanup: () => {},
      info: { nextNotificationAt: null, allNotifications: [] }
    };
  }

  // Start notification
  const startDelay = chunkStart.getTime() - now.getTime();
  if (startDelay > 0) {
    allNotificationTimes.push(new Date(chunkStart));
    timeouts.push(
      setTimeout(() => {
        new Notification('🎬 Action time!', {
          body: `Time to work on: ${chunk.taskTitle}`,
          requireInteraction: false,
          tag: 'chunk-start'
        });
      }, startDelay)
    );
  } else if (now.getTime() < chunkEnd.getTime()) {
    // Task already started but not finished - send immediate notification
    new Notification('⚡ Task in progress!', {
      body: `Currently working on: ${chunk.taskTitle}`,
      tag: 'chunk-active'
    });
  }

  // Nag notifications with context-aware messages
  if (chunk.nagIntervalMinutes > 0 && chunk.type === 'task') {
    const nagInterval = chunk.nagIntervalMinutes * 60 * 1000;
    const totalDuration = chunkEnd.getTime() - chunkStart.getTime();
    let nextNagTime = Math.max(now.getTime(), chunkStart.getTime()) + nagInterval;

    while (nextNagTime < chunkEnd.getTime()) {
      const delay = nextNagTime - now.getTime();
      if (delay > 0) {
        allNotificationTimes.push(new Date(nextNagTime));

        // Calculate progress through the task
        const elapsedTime = nextNagTime - chunkStart.getTime();
        const progress = elapsedTime / totalDuration;

        timeouts.push(
          setTimeout(() => {
            const message = getNagMessage(chunk.taskTitle, progress);
            new Notification(message.title, {
              body: message.body,
              tag: 'nag',
              requireInteraction: false
            });
          }, delay)
        );
      }
      nextNagTime += nagInterval;
    }
  }

  // End notification
  const endDelay = chunkEnd.getTime() - now.getTime();
  if (endDelay > 0) {
    allNotificationTimes.push(new Date(chunkEnd));
    timeouts.push(
      setTimeout(() => {
        new Notification("⏰ Time's up!", {
          body: `Finished with ${chunk.taskTitle}? Mark it complete!`,
          requireInteraction: true,
          tag: 'chunk-end'
        });
        onChunkEnd();
      }, endDelay)
    );
  }

  // Sort notification times
  allNotificationTimes.sort((a, b) => a.getTime() - b.getTime());
  const nextNotification = allNotificationTimes.find(time => time.getTime() > now.getTime()) || null;

  // Cleanup function
  const cleanup = () => {
    timeouts.forEach(clearTimeout);
    if (activeCleanupFunction === cleanup) {
      activeCleanupFunction = null;
    }
  };

  activeCleanupFunction = cleanup;

  return {
    cleanup,
    info: {
      nextNotificationAt: nextNotification,
      allNotifications: allNotificationTimes
    }
  };
}

// Clear all active notifications
export function clearAllNotifications(): void {
  if (activeCleanupFunction) {
    activeCleanupFunction();
    activeCleanupFunction = null;
  }
}
