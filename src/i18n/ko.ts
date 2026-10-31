// 번역의 기준(소스) 언어. en.ts 같은 다른 언어는 이 모양(Dictionary)을 그대로 따른다.
//
// 문구 안의 {이름}은 코드에서 값으로 채워진다.
// - 위젯 이름: {lifeLine} {topGoal} {roadmap} {dailyGoal} {timetable} {weeklyTimeline}
// - 날짜/시간: {year} {month} {monthName} {day} {weekday} {period} {hour} {minute}
interface AboutParagraph {
  text: string;
  emphasized?: boolean;
}

const aboutParagraphs: AboutParagraph[] = [
  {
    text: '완벽해 보였던 계획도 삶 속으로 들어오면 금방 흔들립니다.\n예상보다 일이 바빠지기도 하고, 몸이 생각보다 따라 주지 않기도 하고, 처음에는 중요해 보였던 일이 막상 해 보면 내 방향과 맞지 않을 수도 있습니다.',
  },
  { text: '그래서 계획은 현실과 만나면서 반드시 수정될 수밖에 없습니다.' },
  {
    text: '계획이 너무 복잡하게 연결되어 있으면, 작은 수정 하나가 전체를 흔드는 큰 사건처럼 느껴집니다. 오늘의 계획을 조금 바꾸고 싶을 뿐인데, 월 목표를 고쳐야 하고, 분기 목표를 다시 계산해야 하고 연간 목표의 흐름까지 손봐야 합니다.',
  },
  {
    text: '그러다 보면 계획을 고치는 일 자체가 또 하나의 일이 됩니다.\n이 지점에서 많은 사람들이 지칩니다.',
  },
  { text: '좋은 계획은 나를 자주 다시 시작하게 해 주어야 합니다.', emphasized: true },
  {
    text: '만약 전체 흐름을 미리 그려 보고 싶다면, 월 목표나 분기 목표를 세우기보다 {roadmap}으로 방향과 아이디어를 자유롭게 펼쳐 보는 편이 훨씬 도움이 됩니다.',
  },
];

const ko = {
  app: {
    title: 'Planner Toolkit', // 앱 이름은 번역하지 않고 영어로 고정한다.
  },
  file: {
    defaultName: '무제',
    typeDescription: '플래너 툴킷 파일',
  },
  about: {
    open: '소개',
    title: '플래너 툴킷에는 왜 연간 목표, 분기 목표, 월 목표, 주간 목표가 없을까요?',
    paragraphs: aboutParagraphs,
  },
  topbar: {
    file: '파일',
    new: '새로 만들기',
    open: '열기',
    save: '저장',
    saveAs: '다른 이름으로 저장',
    language: '언어',
  },
  canvas: {
    emptyIntro: '플래너 툴킷은 목적, 목표, 루틴, 일정을 한 번에 관리하는 플래닝 도구입니다.',
    emptyHint: '오른쪽 아래 + 버튼으로 위젯을 추가하고 원하는 위치로 옮겨보세요.',
  },
  zoom: {
    zoomIn: '확대',
    zoomOut: '축소',
    reset: '보기 초기화',
  },
  widgetMenu: {
    heading: '캔버스에 추가할 위젯',
    open: '위젯 추가',
  },
  widgets: {
    lifeLine: {
      title: '인생을 이끄는 문장',
      empty: '아직 인생을 이끄는 문장이 없어요.',
      addPlaceholder: '인생을 이끄는 문장 추가',
    },
    topGoal: {
      title: '이루고 싶은 목표',
      empty: '아직 이루고 싶은 목표가 없어요.',
      addPlaceholder: '이루고 싶은 목표 추가',
    },
    roadmap: {
      title: '마인드맵',
      needTopGoal: '먼저 이루고 싶은 목표를 추가해주세요.',
      empty: '이 목표를 위해 떠오르는 생각을 추가해보세요.',
      addPlaceholder: '새 항목',
      addChildPlaceholder: '하위 항목',
      addChild: '하위 추가',
    },
    dailyGoal: {
      title: '오늘 할 일',
      empty: '오늘 할 일을 추가해보세요.',
      addPlaceholder: '오늘 할 일 추가',
    },
    timetable: {
      title: '루틴',
      addRoutine: '루틴 추가',
      titlePlaceholder: '제목',
      startsLabel: '시작',
      endsLabel: '종료',
      overlapError: '이미 같은 시간대에 다른 루틴이 있어요.',
      empty: '아직 추가된 루틴이 없어요.',
      dragHint: '핸들을 드래그해서 시간을 정해보세요.',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
    },
    weeklyTimeline: {
      title: '일정',
      allDay: '하루종일',
      noEvents: '이 날은 일정이 없어요.',
      addEvent: '이벤트 추가',
      eventTitlePlaceholder: '제목',
      allDayLabel: '하루종일',
      startsLabel: '시작',
      endsLabel: '종료',
      rangeError: '종료 시각이 시작 시각보다 빠를 수 없어요.',
      alarmLabel: '알림',
      alarmNone: '없음',
      alarmAtTime: '이벤트 시간에',
      alarmMin5: '5분 전',
      alarmMin10: '10분 전',
      alarmMin15: '15분 전',
      alarmMin30: '30분 전',
      alarmHour1: '1시간 전',
      alarmHour2: '2시간 전',
      alarmDay1: '1일 전',
      alarmDay2: '2일 전',
      alarmWeek1: '1주 전',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
    },
  },
  common: {
    add: '추가',
    edit: '수정',
    delete: '삭제',
    cancel: '취소',
    confirm: '확인',
    moveUp: '위로 이동',
    moveDown: '아래로 이동',
    close: '닫기',
  },
  confirm: {
    openTitle: '파일 열기',
    openMessage: '선택한 파일의 내용으로 지금 캔버스를 덮어씁니다. 저장하지 않은 내용은 사라져요. 계속할까요?',
    openConfirm: '열기',
    newTitle: '새로 만들기',
    newMessage: '지금 캔버스를 비웁니다. 저장하지 않은 내용은 사라져요. 계속할까요?',
    newConfirm: '새로 만들기',
  },
  saveAsPrompt: {
    title: '파일 이름',
    confirm: '저장',
  },
  autoSave: {
    label: '자동 저장',
    needFile: '파일을 저장하거나 열면 켤 수 있어요.',
    saving: '저장 중…',
    saved: '저장됨',
    error: '파일 오류',
  },
  alerts: {
    autoSaveFailMessage: '자동 저장에 실패해서 껐어요. 저장 메뉴로 직접 저장해 주세요.',
    saveDoneMessage: '저장했어요.',
    saveFailTitle: '저장에 실패했어요.',
    openDoneMessage: '파일을 열었어요.',
    openReadOnlyMessage: '파일을 열었어요. 쓰기를 허용하지 않아 자동 저장은 꺼 둘게요.',
    openInvalidFileMessage: '플래너 툴킷 파일이 아니에요.',
  },
  date: {
    // 요일 배열은 JS의 getDay()(0=일요일) 기준이다.
    weekdaysShort: ['일', '월', '화', '수', '목', '금', '토'],
    // 위크보드의 한 주는 언어와 상관없이 월요일에 시작한다.
    weekdaysMonFirst: ['월', '화', '수', '목', '금', '토', '일'],
    monthsShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    dateLabel: '{month}월 {day}일 ({weekday})',
    monthLabel: '{year}년 {month}월',
    datePill: '{year}. {month}. {day}.',
    time12: '{period} {hour}:{minute}',
    am: '오전',
    pm: '오후',
    prevDay: '이전 날',
    nextDay: '다음 날',
    prevMonth: '이전 달',
    nextMonth: '다음 달',
    hourField: '시',
    minuteField: '분',
    periodField: '오전/오후',
  },
  widgetGuide: {
    perWidgetToggleLabel: '이 위젯 가이드 표시',
    exampleLabel: '예시',
    lifeLine: {
      title: '인생을 이끄는 문장을 적어보세요.',
      body: '여러 개여도 괜찮아요.',
      example: '몸도 마음도 건강하게 산다.',
    },
    topGoal: {
      title: '이루고 싶은 것을 짧은 구절로 적어보세요.',
      body: '어떻게 할지는 지금 생각하지 말고 무엇을 이루고 싶은지만 적어보세요.',
      example: '하프 마라톤 완주',
    },
    roadmap: {
      title: '목표를 이루는 데 도움이 될 방법을 자유롭게 적어보세요.',
      body: '',
      example: '하프 마라톤 완주 → 보조 앱 도움 받기',
    },
    dailyGoal: {
      title: '오늘 할 수 있는 만큼 계획해 보세요.',
      body: '작은 만족은 생각보다 중요해요.',
      example: '보조 앱 가이드 따라 뛰기',
    },
    timetable: {
      title: '잠, 출퇴근, 식사, 집안일처럼 매일 반복하는 루틴을 적어보세요.',
      body: '적어 두면 내가 실제로 쓸 수 있는 시간이 얼마인지 한눈에 보여요.',
      example: '',
    },
    weeklyTimeline: {
      title: '약속, 예약, 회의 같은 일정을 적어보세요.',
      body: '적어 두면 내가 실제로 쓸 수 있는 시간이 얼마인지 한눈에 보여요.',
      example: '',
    },
  },
};

export default ko;
export type Dictionary = typeof ko;
