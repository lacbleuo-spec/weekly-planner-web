import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { locales } from '@/i18n/settings';
import type { Locale } from '@/i18n/types';

const seo: Record<
  Locale,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  en: {
    title: 'Weekboard',
    description:
      'Weekboard is an AI-powered weekly goal management and planner app. Enter a vague goal, and AI goal planning helps you turn it into a realistic weekly plan. You can organize weekly goals into daily action items by weekday and quickly create recurring routines with the goal duplication feature. In addition, execution time settings, reminders, and lock features help improve consistency, while achievement tracking helps manage habit building.',
    keywords: [
      'weekly planner',
      'goal planner',
      'AI planner',
      'weekly goals',
      'routine planner',
      'habit planner',
      'task planner',
      'productivity app',
      'goal tracking',
      'weekly schedule',
    ],
  },

  ko: {
    title: '위크보드',
    description:
      'Weekboard는 AI 기반 주간 목표 관리 및 플래너 앱입니다. 막연한 목표를 입력하면 AI 목표 설계를 통해 현실적인 주간 계획을 구체화할 수 있습니다. 주간 목표를 요일별 실행 항목으로 나누어 관리할 수 있으며, 목표 복제 기능으로 반복 루틴을 빠르게 생성할 수 있습니다. 또한 실행 시간 설정·알림·잠금 기능으로 실행력을 높이고, 목표 달성률 추적으로 습관 형성을 관리할 수 있습니다.',
    keywords: [
      '주간 플래너',
      '목표 관리',
      'AI 플래너',
      '주간 목표',
      '루틴 관리',
      '습관 관리',
      '할 일 관리',
      '생산성 앱',
      '목표 추적',
      '주간 계획표',
    ],
  },

  de: {
    title: 'Weekboard',
    description:
      'Weekboard ist eine KI-gestützte App für Wochenziel-Management und Planung. Wenn du ein vages Ziel eingibst, hilft dir die KI-Zielplanung dabei, einen realistischen Wochenplan zu konkretisieren. Du kannst Wochenziele in tägliche Aufgaben nach Wochentagen aufteilen und mit der Zielkopierfunktion wiederkehrende Routinen schnell erstellen. Zusätzlich helfen Zeiteinstellungen, Erinnerungen und Sperrfunktionen dabei, die Umsetzung zu verbessern, während die Fortschrittsverfolgung beim Aufbau von Gewohnheiten unterstützt.',
    keywords: [
      'Wochenplaner',
      'Zielplaner',
      'KI Planer',
      'Wochenziele',
      'Routine Planer',
      'Gewohnheiten',
      'Aufgabenplaner',
      'Produktivität App',
      'Zielverfolgung',
      'Wochenplanung',
    ],
  },

  es: {
    title: 'Weekboard',
    description:
      'Weekboard es una aplicación de planificación y gestión de objetivos semanales impulsada por IA. Introduce un objetivo poco definido y la planificación con IA te ayudará a convertirlo en un plan semanal realista. Puedes dividir los objetivos semanales en tareas de ejecución por día de la semana y crear rutinas repetitivas rápidamente con la función de duplicación de objetivos. Además, la configuración de horarios, recordatorios y funciones de bloqueo ayudan a mejorar la constancia, mientras que el seguimiento del progreso ayuda a gestionar la formación de hábitos.',
    keywords: [
      'planificador semanal',
      'metas semanales',
      'planificador IA',
      'gestión de objetivos',
      'rutinas',
      'hábitos',
      'productividad',
      'tareas diarias',
      'seguimiento de objetivos',
      'agenda semanal',
    ],
  },

  fr: {
    title: 'Weekboard',
    description:
      'Weekboard est une application de planification et de gestion des objectifs hebdomadaires basée sur l’IA. Saisissez un objectif vague et la planification assistée par IA vous aide à le transformer en un plan hebdomadaire réaliste. Vous pouvez organiser vos objectifs hebdomadaires en tâches d’exécution par jour de la semaine et créer rapidement des routines récurrentes grâce à la fonction de duplication d’objectifs. De plus, les réglages d’horaire, les rappels et les fonctions de verrouillage renforcent l’exécution, tandis que le suivi des progrès aide à gérer la création d’habitudes.',
    keywords: [
      'planificateur hebdomadaire',
      'objectifs hebdomadaires',
      'planificateur IA',
      'gestion des objectifs',
      'routines',
      'habitudes',
      'productivité',
      'suivi des objectifs',
      'agenda hebdomadaire',
      'tâches quotidiennes',
    ],
  },

  ja: {
    title: 'Weekboard',
    description:
      'Weekboardは、AIを活用した週間目標管理・プランナーアプリです。漠然とした目標を入力すると、AI目標設計によって現実的な週間プランへ具体化できます。週間目標を曜日ごとの実行項目に分けて管理でき、目標コピー機能で繰り返しのルーティンも素早く作成できます。さらに、実行時間設定・リマインダー・ロック機能によって実行力を高め、達成率の追跡を通じて習慣形成を管理できます。',
    keywords: [
      '週間プランナー',
      '目標管理',
      'AIプランナー',
      '週間目標',
      'ルーティン管理',
      '習慣管理',
      'タスク管理',
      '生産性アプリ',
      '目標追跡',
      '週間スケジュール',
    ],
  },

  zh: {
    title: 'Weekboard',
    description:
      'Weekboard 是一款基于 AI 的每周目标管理与计划应用。输入一个模糊的目标后，AI 目标规划可以帮助你将其具体化为现实可行的每周计划。你可以将每周目标拆分为按星期管理的执行事项，并通过目标复制功能快速创建重复性例行任务。此外，执行时间设置、提醒和锁定功能可以提升执行力，而目标达成率追踪则有助于习惯养成管理。',
    keywords: [
      '周计划',
      '目标管理',
      'AI计划',
      '每周目标',
      '日程管理',
      '习惯养成',
      '任务管理',
      '效率工具',
      '目标追踪',
      '周规划',
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const safeLocale = locale as Locale;
  const item = seo[safeLocale];

  return {
    title: item.title,
    description: item.description,
    keywords: item.keywords,

    openGraph: {
      title: item.title,
      description: item.description,
      url: `https://www.weekboard.net/${safeLocale}`,
      siteName: 'Weekboard',
      type: 'website',
      locale: safeLocale,
    },

    twitter: {
      card: 'summary',
      title: item.title,
      description: item.description,
    },

    alternates: {
      canonical: `https://www.weekboard.net/${safeLocale}`,
      languages: {
        en: 'https://www.weekboard.net/en',
        ko: 'https://www.weekboard.net/ko',
        de: 'https://www.weekboard.net/de',
        es: 'https://www.weekboard.net/es',
        fr: 'https://www.weekboard.net/fr',
        ja: 'https://www.weekboard.net/ja',
        zh: 'https://www.weekboard.net/zh',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const safeLocale = locale as Locale;

  return children;
}
