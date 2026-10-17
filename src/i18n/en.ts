import type { Dictionary } from './ko';

// ko.ts와 같은 모양을 따라야 한다(빠진 키가 있으면 타입 에러가 난다).
const en: Dictionary = {
  app: {
    title: 'Weekboard',
  },
  file: {
    defaultName: 'Untitled',
    typeDescription: 'Weekboard file',
  },
  about: {
    open: 'About',
    title: 'Why does Weekboard have no yearly, quarterly, monthly, or weekly goals?',
    paragraphs: [
      {
        text: "Even a plan that looked perfect starts to wobble the moment it meets real life.\nWork gets busier than expected, your body doesn't keep up the way you thought it would, and something that seemed important at first may turn out not to fit your direction once you actually try it.",
      },
      { text: 'That is why plans inevitably have to change when they meet reality.' },
      {
        text: "When a plan is tied together too tightly, one small change feels like a big event that shakes everything. You only wanted to tweak today's plan, but now you have to fix the monthly goal, recalculate the quarterly goal, and rework the flow of the yearly goal too.",
      },
      {
        text: 'Before long, fixing the plan becomes yet another task.\nThis is the point where many people burn out.',
      },
      { text: 'A good plan lets you start over again and again.', emphasized: true },
      {
        text: 'If you want to sketch the overall flow in advance, it helps far more to spread out your direction and ideas freely in a {roadmap} than to set monthly or quarterly goals.',
      },
    ],
  },
  topbar: {
    file: 'File',
    new: 'New',
    open: 'Open',
    save: 'Save',
    saveAs: 'Save As',
    language: 'Language',
  },
  canvas: {
    emptyIntro:
      'Weekboard is a planning tool that manages your purpose, goals, routines, and schedule in one place.',
    emptyHint: 'Add widgets with the + button at the bottom right, then move them where you like.',
  },
  zoom: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
  },
  widgetMenu: {
    heading: 'Widgets to add to the canvas',
    open: 'Add widget',
  },
  widgets: {
    lifeLine: {
      title: 'Life in one line',
      empty: 'Nothing written yet.',
      addPlaceholder: 'Write your life in one line',
    },
    topGoal: {
      title: 'Top goal',
      empty: 'No top goals yet.',
      addPlaceholder: 'Add a top goal',
    },
    roadmap: {
      title: 'Mind map',
      needTopGoal: 'Add a top goal first.',
      empty: 'Add ideas that come to mind for this goal.',
      addPlaceholder: 'New item',
      addChildPlaceholder: 'Sub-item',
      addChild: 'Add sub-item',
    },
    dailyGoal: {
      title: "Today's tasks",
      empty: 'Add something to do today.',
      addPlaceholder: "Add today's task",
    },
    timetable: {
      title: 'Routine',
      addRoutine: 'Add routine',
      titlePlaceholder: 'Title',
      startsLabel: 'Start',
      endsLabel: 'End',
      overlapError: 'Another routine already overlaps this time.',
      empty: 'No routines yet.',
      dragHint: 'Drag the handles to set the time.',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
    },
    weeklyTimeline: {
      title: 'Schedule',
      allDay: 'All day',
      noEvents: 'No events on this day.',
      addEvent: 'Add event',
      eventTitlePlaceholder: 'Title',
      allDayLabel: 'All day',
      startsLabel: 'Starts',
      endsLabel: 'Ends',
      rangeError: 'The end time cannot be earlier than the start time.',
      alarmLabel: 'Alert',
      alarmNone: 'None',
      alarmAtTime: 'At time of event',
      alarmMin5: '5 minutes before',
      alarmMin10: '10 minutes before',
      alarmMin15: '15 minutes before',
      alarmMin30: '30 minutes before',
      alarmHour1: '1 hour before',
      alarmHour2: '2 hours before',
      alarmDay1: '1 day before',
      alarmDay2: '2 days before',
      alarmWeek1: '1 week before',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
    },
  },
  common: {
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'OK',
    moveUp: 'Move up',
    moveDown: 'Move down',
    close: 'Close',
  },
  confirm: {
    openTitle: 'Open file',
    openMessage:
      'This replaces the current canvas with the contents of the selected file. Unsaved changes will be lost. Continue?',
    openConfirm: 'Open',
    newTitle: 'New',
    newMessage: 'This clears the current canvas. Unsaved changes will be lost. Continue?',
    newConfirm: 'New',
  },
  saveAsPrompt: {
    title: 'File name',
    confirm: 'Save',
  },
  autoSave: {
    label: 'Auto-save',
    needFile: 'Turns on once you save or open a file.',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'File error',
  },
  alerts: {
    autoSaveFailMessage: 'Auto-save failed and was turned off. Use Save to save manually.',
    saveDoneMessage: 'Saved.',
    saveFailTitle: 'Could not save.',
    openDoneMessage: 'File opened.',
    openInvalidFileMessage: 'This is not a Weekboard file.',
  },
  date: {
    // 요일 배열은 JS의 getDay()(0=일요일) 기준이다.
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    // 위크보드의 한 주는 언어와 상관없이 월요일에 시작한다.
    weekdaysMonFirst: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dateLabel: '{weekday}, {monthName} {day}',
    monthLabel: '{monthName} {year}',
    datePill: '{monthName} {day}, {year}',
    time12: '{hour}:{minute} {period}',
    am: 'AM',
    pm: 'PM',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    hourField: 'Hour',
    minuteField: 'Minute',
    periodField: 'AM/PM',
  },
  widgetGuide: {
    perWidgetToggleLabel: 'Show this widget guide',
    exampleLabel: 'Example',
    lifeLine: {
      title: 'Write how you want to live, in one sentence.',
      body: 'Having more than one is fine.',
      example: 'Live healthy in body and mind.',
    },
    topGoal: {
      title: "Write what you want to achieve for your '{lifeLine}'.",
      body: '',
      example: 'Finish a half marathon',
    },
    roadmap: {
      title: "Freely spread out directions and ideas for your '{topGoal}'.",
      body: '',
      example: 'Finish a half marathon → Get help from a running app',
    },
    dailyGoal: {
      title: "Look at your '{roadmap}' and plan only what you can do today.",
      body: 'Small wins matter more than you think.',
      example: 'Follow the running app guide',
    },
    timetable: {
      title: 'Write what repeats every day, like sleep, commuting, meals, and chores.',
      body: 'Once it is written down, you can see at a glance how much time you really have.',
      example: '',
    },
    weeklyTimeline: {
      title: 'Write appointments, reservations, meetings, and other scheduled events.',
      body: 'Once it is written down, you can see at a glance how much time you really have.',
      example: '',
    },
  },
};

export default en;
