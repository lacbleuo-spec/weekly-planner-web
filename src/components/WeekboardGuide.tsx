'use client';

import type { Locale } from '@/i18n/types';
import { useEffect } from 'react';
import {
  BookOpen,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  LockOpen,
  Plus,
  Trash,
  X,
} from 'lucide-react';

type GuideExampleVariant = 'top' | 'weekly' | 'daily';

type GuideExample = {
  title?: string;
  variant?: GuideExampleVariant;
  blockTitle?: string;
  blockSubtitle?: string;
  inputPlaceholder?: string;
  lines: string[];
};

type GuideSection = {
  title: string;
  paragraphs: string[];
  examples?: GuideExample[];
  steps?: string[];
};

type GuideContent = {
  buttonLabel: string;
  title: string;
  close: string;
  sections: GuideSection[];
};

const weekboardGuideJson: Record<string, GuideContent> = {
  de: {
    buttonLabel: 'Gebrauchsanweisung',
    title: 'Weekboard Gebrauchsanweisung',
    close: 'Schließen',
    sections: [
      {
        title: '1. Leben in einer Zeile',
        paragraphs: [
          'Leben in einer Zeile ist ein Bereich, in dem du einen Satz notierst, der dich in deinem Leben motiviert.',
          'Schreibe in einem Satz auf, welches Leben du führen möchtest und woran du dich im Alltag erinnern willst.',
        ],
      },
      {
        title: '2. Übergeordnete Ziele',
        paragraphs: [
          'Übergeordnete Ziele sind die großen Ziele, die du in deinem Leben am wichtigsten verwalten möchtest.',
          'Für übergeordnete Ziele kannst du Kategorien von A bis Z festlegen.',
          'Wenn du Kategorien festlegst, kannst du beim Erstellen von Wochen- und Tageszielen leichter erkennen, mit welchem übergeordneten Ziel sie verbunden sind.',
        ],
        examples: [
          {
            title: 'Beispiel',
            variant: 'top',
            blockTitle: 'Übergeordnete Ziele',
            blockSubtitle: '3 Ziele',
            inputPlaceholder: 'Übergeordnetes Ziel hinzufügen',
            lines: [
              'A Gesundheitsmanagement',
              'B Finanzielle Stabilität',
              'C Persönliche Entwicklung',
            ],
          },
        ],
      },
      {
        title: '3. Wochenziele',
        paragraphs: [
          'Wochenziele sind der Schritt, in dem du übergeordnete Ziele in konkrete Handlungen für diese Woche verwandelst.',
          'Am besten formulierst du Wochenziele so konkret, dass du sie direkt als Tagesziele für heute übernehmen könntest.',
          'Auch Wochenziele können Kategorien von A bis Z haben.',
          'Wenn du dieselbe Kategorie wie beim übergeordneten Ziel verwendest, kannst du den Zielverlauf leichter verwalten.',
          'Außerdem kannst du Wochenziele in Tagesziele kopieren. Probiere es aus, indem du sie in deine Tagesziele kopierst.',
        ],
        examples: [
          {
            title: 'Beispiel',
            variant: 'weekly',
            blockTitle: 'Wochenziele',
            blockSubtitle: '3 Ziele',
            inputPlaceholder: 'Wochenziel hinzufügen',
            lines: [
              'A 30 Minuten Dehnen',
              'A Nahrungsergänzung nehmen',
              'A Ausfallschritte 12 × 3 Sätze',
            ],
          },
        ],
      },
      {
        title: '4. Tagesziele',
        paragraphs: [
          'Tagesziele sind der Bereich, in dem du die Ziele verwaltest, die du heute tatsächlich umsetzen willst.',
          'Du kannst Ziele aus den Wochenzielen kopieren oder Ziele hinzufügen, die nur für heute nötig sind.',
          'Bei Tageszielen kannst du abhaken, ob du jedes Ziel ausgeführt hast. Prüfe deinen heutigen Umsetzungsstatus, während du erledigte Ziele markierst.',
        ],
        examples: [
          {
            title: 'Beispiel',
            variant: 'daily',
            blockTitle: 'Heute',
            blockSubtitle: '0/5',
            inputPlaceholder: 'Ziel für heute hinzufügen',
            lines: [
              'A 30 Minuten Dehnen',
              'A Nahrungsergänzung nehmen',
              'A Ausfallschritte 12 × 3 Sätze',
              'Z 14:00 Zahnarzttermin',
              'Z Paket verschicken',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          'Tagesziele haben eine Fixieren-Funktion.',
          'Wenn du ein Ziel fixierst, kannst du dieses Ziel nicht verwenden.',
          'Diese Funktion hilft dir, Ziele bis zum Ende umzusetzen, die du leicht aufschieben oder löschen würdest.',
          'Nutze die Fixieren-Funktion zum Beispiel für Ziele wie Sport, Lernen oder Lesen, die du zwar machen willst, aber oft aufschiebst.',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          'Tagesziele haben auch eine Zeit-Erinnerungsfunktion.',
          'Wenn du eine Erinnerungszeit für ein Ziel festlegst, kannst du zur entsprechenden Zeit eine Benachrichtigung erhalten, damit du das Ziel ausführst.',
          'Wenn ein Ziel eine feste Ausführungszeit hat, ist es sinnvoll, eine Erinnerung einzustellen.',
        ],
      },
      {
        title: '5. Empfohlener Ablauf',
        paragraphs: [],
        steps: [
          'Schreibe dein Leben in einer Zeile auf.',
          'Notiere die übergeordneten Ziele, die du in deinem Leben wichtig verwalten möchtest.',
          'Weise jedem übergeordneten Ziel eine Kategorie von A bis Z zu.',
          'Erstelle konkrete Wochenziele, die du diese Woche umsetzen kannst.',
          'Kopiere Wochenziele, die du heute umsetzen willst, in deine Tagesziele.',
          'Füge Termine oder Aufgaben, die heute unbedingt erledigt werden müssen, direkt zu den Tageszielen hinzu.',
          'Nutze die Fixieren-Funktion für wichtige Ziele.',
          'Stelle Erinnerungen für Ziele ein, die zu einer festen Zeit erledigt werden müssen.',
        ],
      },
      {
        title: '6. KI-Planer',
        paragraphs: [
          'Der KI-Planer empfiehlt dir konkrete Ziele, die du diese Woche direkt ausprobieren kannst, wenn du ein vages Ziel eingibst.',
          'Beim ersten Planen kann es schwer sein, sofort zu wissen, was du diese Woche tun solltest.',
          'Gib in diesem Fall ein vages Ziel in den KI-Planer ein. Die KI empfiehlt Ziele auf einem Niveau, das du diese Woche umsetzen kannst.',
          'Empfohlene Ziele kannst du direkt zu deinen Wochenzielen hinzufügen.',
        ],
      },
    ],
  },
  en: {
    buttonLabel: 'User Guide',
    title: 'Weekboard User Guide',
    close: 'Close',
    sections: [
      {
        title: '1. Life in One Line',
        paragraphs: [
          'Life in One Line is a space where you write a sentence that motivates your life.',
          'Write one sentence about what kind of life you want to live and what you want to remember as you go through life.',
        ],
      },
      {
        title: '2. Top-Level Goals',
        paragraphs: [
          'Top-Level Goals are the big goals you want to manage most importantly in your life.',
          'You can assign categories from A to Z to your Top-Level Goals.',
          'When categories are set, you can easily see which Top-Level Goal your weekly and daily goals are connected to.',
        ],
        examples: [
          {
            title: 'Example',
            variant: 'top',
            blockTitle: 'Top-Level Goals',
            blockSubtitle: '3 goals',
            inputPlaceholder: 'Add top-level goal',
            lines: [
              'A Health management',
              'B Financial stability',
              'C Self-development',
            ],
          },
        ],
      },
      {
        title: '3. Weekly Goals',
        paragraphs: [
          'Weekly Goals are the step where you turn Top-Level Goals into actions you can carry out this week.',
          'It is best to write weekly goals as concrete actions that are specific enough to be copied directly into today’s daily goals.',
          'Weekly Goals can also use categories from A to Z.',
          'Using the same category as the Top-Level Goal makes it easier to manage the flow of your goals.',
          'You can also copy Weekly Goals into Daily Goals. Try copying them into your daily goals.',
        ],
        examples: [
          {
            title: 'Example',
            variant: 'weekly',
            blockTitle: 'Weekly Goals',
            blockSubtitle: '3 goals',
            inputPlaceholder: 'Add weekly goal',
            lines: [
              'A Stretch for 30 minutes',
              'A Take supplements',
              'A Lunges 12 reps × 3 sets',
            ],
          },
        ],
      },
      {
        title: '4. Daily Goals',
        paragraphs: [
          'Daily Goals are the space where you manage the goals you will actually execute today.',
          'You can bring in goals copied from Weekly Goals or add goals that are only needed today.',
          'In Daily Goals, you can check whether each goal has been completed. Track today’s execution status by checking off completed goals.',
        ],
        examples: [
          {
            title: 'Example',
            variant: 'daily',
            blockTitle: 'Today',
            blockSubtitle: '0/5',
            inputPlaceholder: 'Add today’s goal',
            lines: [
              'A Stretch for 30 minutes',
              'A Take supplements',
              'A Lunges 12 reps × 3 sets',
              'Z 14:00 Dentist appointment',
              'Z Send package',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          'Daily Goals include a lock feature.',
          'When you lock a goal, that goal cannot be used.',
          'This feature helps you follow through on goals you might otherwise postpone or delete.',
          'For example, try using the lock feature for goals like exercise, studying, or reading—things you want to do but often put off.',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          'Daily Goals also include a time reminder feature.',
          'If you set a reminder time for a goal, you can receive a notification at that time so you can execute it.',
          'If a goal has a set execution time, it is a good idea to set a reminder.',
        ],
      },
      {
        title: '5. Recommended Flow',
        paragraphs: [],
        steps: [
          'Write your Life in One Line.',
          'Write the Top-Level Goals you want to manage as important parts of your life.',
          'Assign categories from A to Z to each Top-Level Goal.',
          'Write concrete Weekly Goals you can execute this week.',
          'Copy the Weekly Goals you will execute today into Daily Goals.',
          'Add must-do tasks or appointments for today directly into Daily Goals.',
          'Use the lock feature for important goals.',
          'Set reminders for goals that must be done at a fixed time.',
        ],
      },
      {
        title: '6. AI Planner',
        paragraphs: [
          'AI Planner recommends concrete goals you can try this week when you enter a vague goal.',
          'When you first start planning, it can be hard to know what to do this week right away.',
          'In that case, enter a vague goal into AI Planner. AI will recommend goals at a level you can execute this week.',
          'Recommended goals can be added directly to Weekly Goals.',
        ],
      },
    ],
  },
  es: {
    buttonLabel: 'Guía de uso',
    title: 'Guía de uso de Weekboard',
    close: 'Cerrar',
    sections: [
      {
        title: '1. Vida en una línea',
        paragraphs: [
          'Vida en una línea es un espacio para escribir una frase que motive tu vida.',
          'Escribe en una sola frase qué tipo de vida quieres vivir y qué no quieres olvidar en el camino.',
        ],
      },
      {
        title: '2. Objetivos de nivel superior',
        paragraphs: [
          'Los objetivos de nivel superior son los grandes objetivos que quieres gestionar como lo más importante en tu vida.',
          'Puedes asignar categorías de la A a la Z a tus objetivos de nivel superior.',
          'Si defines categorías, podrás ver fácilmente con qué objetivo de nivel superior se conectan tus metas semanales y diarias.',
        ],
        examples: [
          {
            title: 'Ejemplo',
            variant: 'top',
            blockTitle: 'Objetivos de nivel superior',
            blockSubtitle: '3 metas',
            inputPlaceholder: 'Añadir objetivo de nivel superior',
            lines: [
              'A Gestión de salud',
              'B Estabilidad financiera',
              'C Desarrollo personal',
            ],
          },
        ],
      },
      {
        title: '3. Metas semanales',
        paragraphs: [
          'Las metas semanales son el paso en el que conviertes los objetivos de nivel superior en acciones que puedes realizar esta semana.',
          'Conviene escribir las metas semanales como acciones tan concretas que puedas copiarlas directamente en las metas diarias de hoy.',
          'Las metas semanales también pueden usar categorías de la A a la Z.',
          'Usar la misma categoría que el objetivo de nivel superior facilita gestionar el flujo de tus metas.',
          'También puedes copiar metas semanales a metas diarias. Prueba a copiarlas y usarlas en tus metas diarias.',
        ],
        examples: [
          {
            title: 'Ejemplo',
            variant: 'weekly',
            blockTitle: 'Metas semanales',
            blockSubtitle: '3 metas',
            inputPlaceholder: 'Agregar meta semanal',
            lines: [
              'A Estirar 30 minutos',
              'A Tomar suplementos',
              'A Zancadas 12 repeticiones × 3 series',
            ],
          },
        ],
      },
      {
        title: '4. Metas diarias',
        paragraphs: [
          'Las metas diarias son el espacio donde gestionas las metas que realmente ejecutarás hoy.',
          'Puedes traer metas copiadas desde las metas semanales o añadir metas que solo necesitas hoy.',
          'En las metas diarias puedes marcar si completaste cada meta. Revisa tu estado de ejecución de hoy marcando las metas terminadas.',
        ],
        examples: [
          {
            title: 'Ejemplo',
            variant: 'daily',
            blockTitle: 'Hoy',
            blockSubtitle: '0/5',
            inputPlaceholder: 'Agregar meta para hoy',
            lines: [
              'A Estirar 30 minutos',
              'A Tomar suplementos',
              'A Zancadas 12 repeticiones × 3 series',
              'Z 14:00 Cita con el dentista',
              'Z Enviar paquete',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          'Las metas diarias incluyen una función de bloqueo.',
          'Cuando bloqueas una meta, esa meta no se puede usar.',
          'Esta función te ayuda a completar metas que podrías aplazar o borrar fácilmente.',
          'Por ejemplo, usa la función de bloqueo para metas como hacer ejercicio, estudiar o leer: cosas que quieres hacer pero sueles posponer.',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          'Las metas diarias también incluyen una función de recordatorio por hora.',
          'Si configuras una hora de recordatorio para una meta, recibirás una notificación a esa hora para poder ejecutarla.',
          'Si una meta tiene una hora de ejecución definida, es recomendable configurar un recordatorio.',
        ],
      },
      {
        title: '5. Flujo recomendado',
        paragraphs: [],
        steps: [
          'Escribe tu Vida en una línea.',
          'Escribe los objetivos de nivel superior que quieres gestionar como importantes en tu vida.',
          'Asigna categorías de la A a la Z a cada objetivo de nivel superior.',
          'Escribe metas semanales concretas que puedas ejecutar esta semana.',
          'Copia a las metas diarias las metas semanales que ejecutarás hoy.',
          'Añade directamente a las metas diarias las tareas o citas que debes hacer hoy.',
          'Usa la función de bloqueo para metas importantes.',
          'Configura recordatorios para metas que deben hacerse a una hora determinada.',
        ],
      },
      {
        title: '6. Planificador IA',
        paragraphs: [
          'El Planificador IA recomienda metas concretas que puedes probar esta semana cuando introduces una meta vaga.',
          'Al empezar a planificar, puede ser difícil saber de inmediato qué hacer esta semana.',
          'En ese caso, introduce una meta vaga en el Planificador IA. La IA recomendará metas a un nivel que puedas ejecutar esta semana.',
          'Las metas recomendadas se pueden añadir directamente a las metas semanales.',
        ],
      },
    ],
  },
  fr: {
    buttonLabel: 'Guide d’utilisation',
    title: 'Guide d’utilisation de Weekboard',
    close: 'Fermer',
    sections: [
      {
        title: '1. Une ligne de vie',
        paragraphs: [
          'Une ligne de vie est un espace où écrire une phrase qui motive votre vie.',
          'Écrivez en une phrase la vie que vous voulez mener et ce que vous voulez garder en mémoire au quotidien.',
        ],
      },
      {
        title: '2. Objectifs de niveau supérieur',
        paragraphs: [
          'Les objectifs de niveau supérieur sont les grands objectifs que vous voulez gérer comme les plus importants dans votre vie.',
          'Vous pouvez attribuer des catégories de A à Z aux objectifs de niveau supérieur.',
          'En définissant des catégories, vous pouvez facilement voir à quel objectif de niveau supérieur vos objectifs hebdomadaires et quotidiens sont liés.',
        ],
        examples: [
          {
            title: 'Exemple',
            variant: 'top',
            blockTitle: 'Objectifs de niveau supérieur',
            blockSubtitle: '3 objectifs',
            inputPlaceholder: 'Ajouter un objectif de niveau supérieur',
            lines: [
              'A Gestion de la santé',
              'B Stabilité financière',
              'C Développement personnel',
            ],
          },
        ],
      },
      {
        title: '3. Objectifs hebdomadaires',
        paragraphs: [
          'Les objectifs hebdomadaires sont l’étape où vous transformez les objectifs de niveau supérieur en actions réalisables cette semaine.',
          'Il est préférable de les formuler comme des actions assez concrètes pour être copiées directement dans les objectifs quotidiens d’aujourd’hui.',
          'Les objectifs hebdomadaires peuvent également utiliser des catégories de A à Z.',
          'Utiliser la même catégorie que l’objectif de niveau supérieur facilite la gestion du fil de vos objectifs.',
          'Vous pouvez aussi copier les objectifs hebdomadaires dans les objectifs quotidiens. Essayez de les copier et de les utiliser dans vos objectifs quotidiens.',
        ],
        examples: [
          {
            title: 'Exemple',
            variant: 'weekly',
            blockTitle: 'Objectifs hebdomadaires',
            blockSubtitle: '3 objectifs',
            inputPlaceholder: 'Ajouter un objectif hebdomadaire',
            lines: [
              'A Étirements 30 minutes',
              'A Prendre des compléments',
              'A Fentes 12 répétitions × 3 séries',
            ],
          },
        ],
      },
      {
        title: '4. Objectifs quotidiens',
        paragraphs: [
          'Les objectifs quotidiens sont l’espace où gérer les objectifs que vous allez réellement exécuter aujourd’hui.',
          'Vous pouvez importer des objectifs copiés depuis les objectifs hebdomadaires ou ajouter des objectifs nécessaires uniquement aujourd’hui.',
          'Dans les objectifs quotidiens, vous pouvez cocher chaque objectif exécuté. Suivez l’état d’exécution de votre journée en cochant les objectifs terminés.',
        ],
        examples: [
          {
            title: 'Exemple',
            variant: 'daily',
            blockTitle: 'Aujourd’hui',
            blockSubtitle: '0/5',
            inputPlaceholder: 'Ajouter un objectif pour aujourd’hui',
            lines: [
              'A Étirements 30 minutes',
              'A Prendre des compléments',
              'A Fentes 12 répétitions × 3 séries',
              'Z 14:00 Rendez-vous chez le dentiste',
              'Z Envoyer un colis',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          'Les objectifs quotidiens disposent d’une fonction de verrouillage.',
          'Lorsque vous verrouillez un objectif, cet objectif ne peut pas être utilisé.',
          'Cette fonction vous aide à aller jusqu’au bout des objectifs que vous pourriez facilement repousser ou supprimer.',
          'Par exemple, utilisez la fonction de verrouillage pour le sport, les études ou la lecture — des objectifs que vous voulez faire mais que vous reportez souvent.',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          'Les objectifs quotidiens disposent aussi d’une fonction de rappel horaire.',
          'Si vous définissez une heure de rappel pour un objectif, vous pouvez recevoir une notification à cette heure afin de l’exécuter.',
          'Si un objectif doit être réalisé à une heure précise, il est conseillé de définir un rappel.',
        ],
      },
      {
        title: '5. Flux recommandé',
        paragraphs: [],
        steps: [
          'Rédigez votre Une ligne de vie.',
          'Écrivez les objectifs de niveau supérieur que vous voulez gérer comme importants dans votre vie.',
          'Attribuez une catégorie de A à Z à chaque objectif de niveau supérieur.',
          'Rédigez des objectifs hebdomadaires concrets que vous pouvez exécuter cette semaine.',
          'Copiez dans les objectifs quotidiens les objectifs hebdomadaires que vous exécuterez aujourd’hui.',
          'Ajoutez directement aux objectifs quotidiens les tâches ou rendez-vous indispensables d’aujourd’hui.',
          'Utilisez la fonction de verrouillage pour les objectifs importants.',
          'Définissez des rappels pour les objectifs à effectuer à une heure précise.',
        ],
      },
      {
        title: '6. Planificateur IA',
        paragraphs: [
          'Le Planificateur IA recommande des objectifs concrets que vous pouvez essayer cette semaine lorsque vous saisissez un objectif vague.',
          'Au début de la planification, il peut être difficile de savoir immédiatement quoi faire cette semaine.',
          'Dans ce cas, saisissez un objectif vague dans le Planificateur IA. L’IA recommandera des objectifs réalisables cette semaine.',
          'Les objectifs recommandés peuvent être ajoutés directement aux objectifs hebdomadaires.',
        ],
      },
    ],
  },
  ja: {
    buttonLabel: '使い方ガイド',
    title: 'Weekboard 使い方ガイド',
    close: '閉じる',
    sections: [
      {
        title: '1. 人生の一行',
        paragraphs: [
          '人生の一行は、自分の人生の動機になる言葉を書く場所です。',
          'どんな人生を送りたいのか、何を忘れずに生きたいのかを、一文で書いてみましょう。',
        ],
      },
      {
        title: '2. 最上位目標',
        paragraphs: [
          '最上位目標は、人生で最も大切に管理したい大きな目標です。',
          '最上位目標には、AからZまでのカテゴリを指定できます。',
          'カテゴリを決めておくと、週間目標や日次目標を作るときに、どの目標が最上位目標とつながっているかを簡単に確認できます。',
        ],
        examples: [
          {
            title: '例',
            variant: 'top',
            blockTitle: '最上位目標',
            blockSubtitle: '3 目標',
            inputPlaceholder: '最上位目標を追加',
            lines: ['A 健康管理', 'B 経済的安定', 'C 自己成長'],
          },
        ],
      },
      {
        title: '3. 週間目標',
        paragraphs: [
          '週間目標は、最上位目標を今週実行できる行動に変える段階です。',
          '週間目標は、今日の日次目標にそのまま書いてもよいくらい具体的な行動として書くのがおすすめです。',
          '週間目標にも、AからZまでのカテゴリを選択できます。',
          '最上位目標と同じカテゴリを使うと、目標の流れをより簡単に管理できます。',
          'また、週間目標は日次目標にコピーできます。日次目標にコピーして使ってみてください。',
        ],
        examples: [
          {
            title: '例',
            variant: 'weekly',
            blockTitle: '週間目標',
            blockSubtitle: '3 目標',
            inputPlaceholder: '週間目標を追加',
            lines: [
              'A ストレッチ30分',
              'A サプリを飲む',
              'A ランジ12回×3セット',
            ],
          },
        ],
      },
      {
        title: '4. 日次目標',
        paragraphs: [
          '日次目標は、今日実際に実行する目標を管理する場所です。',
          '週間目標からコピーした目標を取り込むことも、今日だけ必要な目標を直接追加することもできます。',
          '日次目標では、各目標を実行したかどうかをチェックできます。完了した目標にチェックしながら、今日の実行状況を確認してみましょう。',
        ],
        examples: [
          {
            title: '例',
            variant: 'daily',
            blockTitle: '今日',
            blockSubtitle: '0/5',
            inputPlaceholder: '今日の目標を追加',
            lines: [
              'A ストレッチ30分',
              'A サプリを飲む',
              'A ランジ12回×3セット',
              'Z 14:00 歯医者の予約',
              'Z 荷物を送る',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          '日次目標にはロック機能があります。',
          '目標をロックすると、その目標は使用できません。',
          'この機能は、つい先延ばしにしたり削除したくなる目標を、最後まで実行する助けになります。',
          'たとえば運動、勉強、読書のように、やる気はあるけれどよく先延ばしにしてしまう目標には、ロック機能を使ってみてください。',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          '日次目標には時間リマインダー機能もあります。',
          '目標にリマインダー時刻を設定すると、その時刻に目標を実行できるよう通知を受け取れます。',
          '実行する時間が決まっている目標なら、リマインダーを設定しておくのがおすすめです。',
        ],
      },
      {
        title: '5. おすすめの使い方',
        paragraphs: [],
        steps: [
          '人生の一行を書きます。',
          '人生で大切に管理したい最上位目標を書きます。',
          '各最上位目標にAからZまでのカテゴリを指定します。',
          '今週実行できる具体的な週間目標を書きます。',
          '週間目標のうち、今日実行する目標を日次目標にコピーします。',
          '今日必ずやるべき予定は、日次目標に直接追加します。',
          '重要な目標にはロック機能を使います。',
          '決まった時間に行う目標にはリマインダーを設定します。',
        ],
      },
      {
        title: '6. AIプランナー',
        paragraphs: [
          'AIプランナーは、曖昧な目標を入力すると、今週すぐに試せる具体的な目標を提案してくれる機能です。',
          '最初に計画を立てるときは、今週すぐに何をすればよいか思い浮かばないことがあります。',
          'そんなときはAIプランナーに曖昧な目標を入力してみてください。AIが今週実行できるレベルの目標を提案します。',
          '提案された目標は、そのまま週間目標に追加できます。',
        ],
      },
    ],
  },
  ko: {
    buttonLabel: '사용 설명서',
    title: 'Weekboard 사용 설명서',
    close: '닫기',
    sections: [
      {
        title: '1. 인생 한 줄',
        paragraphs: [
          '인생 한 줄은 내 삶의 동기가 되는 문장을 적는 공간입니다.',
          '내가 어떤 삶을 살고 싶은지, 무엇을 잊지 않고 살아가고 싶은지 한 문장으로 적어보세요.',
        ],
      },
      {
        title: '2. 최상위 목표',
        paragraphs: [
          '최상위 목표는 삶에서 가장 중요하게 관리하고 싶은 큰 목표입니다.',
          '최상위 목표에는 A부터 Z까지의 카테고리를 지정할 수 있습니다.',
          '카테고리를 정해 두면 주간 목표와 일간 목표를 만들 때 어떤 목표가 최상위 목표와 연결되어 있는지 쉽게 확인할 수 있습니다.',
        ],
        examples: [
          {
            title: '예시',
            variant: 'top',
            blockTitle: '최상위 목표',
            blockSubtitle: '3 목표',
            inputPlaceholder: '최상위 목표 추가',
            lines: ['A 건강 관리', 'B 경제적 안정', 'C 자기계발'],
          },
        ],
      },
      {
        title: '3. 주간 목표',
        paragraphs: [
          '주간 목표는 최상위 목표를 이번 주에 실행 가능한 행동으로 바꾸는 단계입니다.',
          '주간 목표는 오늘의 일간 목표에 그대로 적어도 될 정도로 구체적인 행동으로 작성하는 것이 좋습니다.',
          '주간 목표도 A부터 Z까지 카테고리를 선택할 수 있습니다.',
          '최상위 목표와 같은 카테고리를 사용하면 목표의 흐름을 더 쉽게 관리할 수 있습니다.',
          '또한 주간 목표는 일간 목표로 복제할 수 있습니다. 일간 목표에 복제해 사용해 보세요.',
        ],
        examples: [
          {
            title: '예시',
            variant: 'weekly',
            blockTitle: '주간 목표',
            blockSubtitle: '3 목표',
            inputPlaceholder: '이번 주 목표 추가',
            lines: ['A 스트레칭 30분', 'A 영양제 섭취', 'A 런지 12회 3세트'],
          },
        ],
      },
      {
        title: '4. 일간 목표',
        paragraphs: [
          '일간 목표는 오늘 실제로 실행할 목표를 관리하는 공간입니다.',
          '주간 목표에서 복제한 목표를 가져올 수도 있고, 오늘만 필요한 목표를 직접 추가할 수도 있습니다.',
          '일간 목표에서는 각 목표를 실행했는지 체크할 수 있습니다. 완료한 목표를 체크하면서 오늘의 실행 상태를 확인해 보세요.',
        ],
        examples: [
          {
            title: '예시',
            variant: 'daily',
            blockTitle: '오늘',
            blockSubtitle: '0/5',
            inputPlaceholder: '오늘 목표 추가',
            lines: [
              'A 스트레칭 30분',
              'A 영양제 섭취',
              'A 런지 12회 3세트',
              'Z 14:00 치과 예약',
              'Z 택배 보내기',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          '일간 목표에는 잠금 기능이 있습니다.',
          '목표를 잠그면 해당 목표를 사용할 수 없습니다.',
          '이 기능은 쉽게 미루거나 지워버리고 싶은 목표를 끝까지 실행하도록 도와줍니다.',
          '예를 들어 운동, 공부, 독서처럼 의지는 있지만 자주 미루게 되는 목표는 잠금 기능을 사용해 보세요.',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          '일간 목표에는 시간 알림 기능도 있습니다.',
          '목표에 알림 시간을 설정하면 해당 시간에 목표를 실행할 수 있도록 알림을 받을 수 있습니다.',
          '실행 시간이 정해져 있는 목표라면 알림을 설정해 두는 것이 좋습니다.',
        ],
      },
      {
        title: '5. 추천 사용 흐름',
        paragraphs: [],
        steps: [
          '인생 한 줄을 작성합니다.',
          '삶에서 중요하게 관리하고 싶은 최상위 목표를 적습니다.',
          '각 최상위 목표에 A부터 Z까지 카테고리를 지정합니다.',
          '이번 주에 실행할 수 있는 구체적 주간 목표를 작성합니다.',
          '주간 목표 중 오늘 실행할 목표를 일간 목표로 복제합니다.',
          '오늘 꼭 해야 하는 일정은 일간 목표에 직접 추가합니다.',
          '중요한 목표에는 잠금 기능을 사용합니다.',
          '정해진 시간에 해야 하는 목표에는 알림을 설정합니다.',
        ],
      },
      {
        title: '6. AI 플래너',
        paragraphs: [
          'AI 플래너는 막연한 목표를 입력하면 이번 주에 바로 실행해 볼 수 있는 구체적인 목표를 추천해 주는 기능입니다.',
          '처음 플래닝을 할 때는 당장 이번 주에 무엇을 해야 할지 떠올리기 어려울 수 있습니다.',
          '이럴 때 AI 플래너에 막연한 목표를 입력해 보세요. AI가 이번 주에 실행 가능한 수준의 목표를 추천해 줍니다.',
          '추천받은 목표는 바로 주간 목표에 추가할 수 있습니다.',
        ],
      },
    ],
  },
  zh: {
    buttonLabel: '使用说明',
    title: 'Weekboard 使用说明',
    close: '关闭',
    sections: [
      {
        title: '1. 人生一句话',
        paragraphs: [
          '人生一句话是用来写下激励你生活的一句话的空间。',
          '请用一句话写下你想过怎样的人生，以及你希望在生活中始终记住什么。',
        ],
      },
      {
        title: '2. 最高层目标',
        paragraphs: [
          '最高层目标是你在人生中最想重点管理的大目标。',
          '你可以为最高层目标指定 A 到 Z 的分类。',
          '设置分类后，在创建每周目标和每日目标时，可以更容易看出它们与哪个最高层目标相连。',
        ],
        examples: [
          {
            title: '示例',
            variant: 'top',
            blockTitle: '最高层目标',
            blockSubtitle: '3 目标',
            inputPlaceholder: '添加最高层目标',
            lines: ['A 健康管理', 'B 财务稳定', 'C 自我提升'],
          },
        ],
      },
      {
        title: '3. 每周目标',
        paragraphs: [
          '每周目标是把最高层目标转化为本周可执行行动的阶段。',
          '最好把每周目标写得足够具体，具体到可以直接作为今天的每日目标。',
          '每周目标也可以选择 A 到 Z 的分类。',
          '如果使用与最高层目标相同的分类，就能更轻松地管理目标的流向。',
          '此外，每周目标可以复制到每日目标中。试着复制到每日目标中使用吧。',
        ],
        examples: [
          {
            title: '示例',
            variant: 'weekly',
            blockTitle: '每周目标',
            blockSubtitle: '3 目标',
            inputPlaceholder: '添加每周目标',
            lines: [
              'A 拉伸 30 分钟',
              'A 服用营养补充剂',
              'A 弓步蹲 12 次 × 3 组',
            ],
          },
        ],
      },
      {
        title: '4. 每日目标',
        paragraphs: [
          '每日目标是管理今天实际要执行的目标的空间。',
          '你可以从每周目标中复制目标，也可以直接添加今天才需要的目标。',
          '在每日目标中，你可以勾选每个目标是否已执行。通过勾选已完成的目标，查看今天的执行状态。',
        ],
        examples: [
          {
            title: '示例',
            variant: 'daily',
            blockTitle: '今天',
            blockSubtitle: '0/5',
            inputPlaceholder: '添加今日目标',
            lines: [
              'A 拉伸 30 分钟',
              'A 服用营养补充剂',
              'A 弓步蹲 12 次 × 3 组',
              'Z 14:00 牙医预约',
              'Z 寄快递',
            ],
          },
        ],
      },
      {
        title: '1)',
        paragraphs: [
          '每日目标有锁定功能。',
          '锁定目标后，该目标将无法使用。',
          '这个功能可以帮助你坚持执行那些容易拖延或删除的目标。',
          '例如运动、学习、阅读这类有意愿但经常拖延的目标，可以试试使用锁定功能。',
        ],
      },
      {
        title: '2)',
        paragraphs: [
          '每日目标也有时间提醒功能。',
          '为目标设置提醒时间后，你可以在相应时间收到通知，以便执行目标。',
          '如果目标有固定执行时间，建议设置提醒。',
        ],
      },
      {
        title: '5. 推荐使用流程',
        paragraphs: [],
        steps: [
          '填写人生一句话。',
          '写下你在人生中想重点管理的最高层目标。',
          '为每个最高层目标指定 A 到 Z 的分类。',
          '写下本周可以执行的具体每周目标。',
          '把每周目标中今天要执行的目标复制到每日目标。',
          '今天必须完成的事项直接添加到每日目标。',
          '对重要目标使用锁定功能。',
          '对需要在固定时间完成的目标设置提醒。',
        ],
      },
      {
        title: '6. AI 计划器',
        paragraphs: [
          'AI 计划器是在你输入模糊目标时，为你推荐本周可以马上尝试的具体目标的功能。',
          '刚开始计划时，你可能很难马上想到本周应该做什么。',
          '这时可以在 AI 计划器中输入一个模糊目标。AI 会推荐本周可执行水平的目标。',
          '推荐的目标可以直接添加到每周目标中。',
        ],
      },
    ],
  },
};

function guideFor(locale: Locale) {
  return weekboardGuideJson[locale] ?? weekboardGuideJson.en;
}

function parseGuideExampleLine(line: string) {
  const labelMatch = line.match(/^([A-Z])\s+(.+)$/);

  const label = labelMatch?.[1] ?? 'A';
  const rawTitle = labelMatch?.[2] ?? line;

  const timeMatch = rawTitle.match(/^(\d{2}:\d{2})\s+(.+)$/);

  return {
    label,
    time: timeMatch?.[1] ?? null,
    title: timeMatch?.[2] ?? rawTitle,
  };
}

function GuideGoalLabel({ label }: { label: string }) {
  return (
    <span className='flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 px-1.5 text-center text-[11px] font-bold text-blue-500'>
      {label}
    </span>
  );
}

function GuideDragHandle() {
  return (
    <span
      className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full'
      aria-hidden='true'
    >
      <span className='flex flex-col items-center justify-center gap-[2.5px]'>
        <span className='h-[1.5px] w-[14px] rounded-full bg-gray-400' />
        <span className='h-[1.5px] w-[14px] rounded-full bg-gray-400' />
        <span className='h-[1.5px] w-[14px] rounded-full bg-gray-400' />
      </span>
    </span>
  );
}

function GuideAddInput({ placeholder }: { placeholder: string }) {
  return (
    <div className='mt-1.5 flex items-center gap-2 rounded-[12px] bg-[#f2f2f7] px-3 py-2.5'>
      <p className='min-w-0 flex-1 truncate text-[13px] text-gray-500'>
        {placeholder}
      </p>

      <span className='text-blue-500' aria-hidden='true'>
        <span className='flex h-[20px] w-[20px] items-center justify-center rounded-full bg-blue-500 text-white'>
          <Plus size={13} strokeWidth={3} />
        </span>
      </span>
    </div>
  );
}

function GuideGoalRow({
  line,
  showCopy = false,
}: {
  line: string;
  showCopy?: boolean;
}) {
  const goal = parseGuideExampleLine(line);

  return (
    <div className='flex items-center gap-1.5 rounded-[12px] bg-white px-0.5 py-2'>
      <GuideGoalLabel label={goal.label} />

      <p className='min-w-0 flex-1 truncate text-[14px] font-normal text-black'>
        {goal.title}
      </p>

      {showCopy && (
        <span
          className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500'
          aria-hidden='true'
        >
          <Copy size={15} />
        </span>
      )}

      <GuideDragHandle />

      <span className='shrink-0 p-0.5 text-red-500' aria-hidden='true'>
        <Trash size={16} />
      </span>
    </div>
  );
}

function GuideDailyRow({ line }: { line: string }) {
  const goal = parseGuideExampleLine(line);

  return (
    <div className='flex items-center gap-1.5 rounded-[12px] bg-white px-0.5 py-2'>
      <GuideGoalLabel label={goal.label} />

      <span className='shrink-0 text-gray-400' aria-hidden='true'>
        <Circle size={20} />
      </span>

      <p className='min-w-0 flex-1 truncate text-[14px] font-normal text-black'>
        {goal.time && <span className='mr-1.5 tabular-nums'>{goal.time}</span>}
        {goal.title}
      </p>

      <span
        className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400'
        aria-hidden='true'
      >
        <LockOpen size={15} />
      </span>

      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          goal.time ? 'text-blue-500' : 'text-gray-400'
        }`}
        aria-hidden='true'
      >
        <Clock size={15} />
      </span>

      <GuideDragHandle />

      <span className='shrink-0 p-0.5 text-red-500' aria-hidden='true'>
        <Trash size={16} />
      </span>
    </div>
  );
}

function GuidePlannerBlock({ example }: { example: GuideExample }) {
  const variant = example.variant ?? 'top';

  return (
    <div className='space-y-2'>
      {example.title && (
        <p className='text-[14px] font-semibold leading-6 text-black'>
          {example.title}
        </p>
      )}

      <section
        className='rounded-[20px] bg-white p-4'
        style={{
          border: '1px solid rgba(17, 24, 39, 0.06)',
        }}
      >
        <div className='flex w-full items-center justify-between'>
          <div className='text-left'>
            <h4 className='text-[15px] font-semibold text-black'>
              {example.blockTitle}
            </h4>
            <p className='mt-0.5 text-[11px] text-gray-500'>
              {example.blockSubtitle}
            </p>
          </div>

          <span
            className='flex h-7 w-7 items-center justify-center rounded-full text-gray-500'
            aria-hidden='true'
          >
            <ChevronUp size={16} />
          </span>
        </div>

        <div className='mt-3 space-y-1'>
          {example.lines.map((line) =>
            variant === 'daily' ? (
              <GuideDailyRow key={line} line={line} />
            ) : (
              <GuideGoalRow
                key={line}
                line={line}
                showCopy={variant === 'weekly'}
              />
            ),
          )}

          <GuideAddInput placeholder={example.inputPlaceholder ?? ''} />
        </div>
      </section>
    </div>
  );
}

export function WeekboardGuideButton({ onClick }: { onClick: () => void }) {
  const guide = weekboardGuideJson.ko;

  return (
    <button
      type='button'
      onClick={onClick}
      className='flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 transition active:scale-[0.98] active:bg-gray-100'
      aria-label={guide.buttonLabel}
      title={guide.buttonLabel}
    >
      <BookOpen size={17} />
    </button>
  );
}

export function WeekboardGuideMobileButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const guide = weekboardGuideJson.ko;

  return (
    <button
      type='button'
      onClick={onClick}
      className='fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition active:scale-[0.98] active:bg-gray-100 xl:hidden'
      aria-label={guide.buttonLabel}
      title={guide.buttonLabel}
    >
      <BookOpen size={17} />
    </button>
  );
}

export function WeekboardGuideModal({
  locale,
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const guide = guideFor(locale);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 p-4'
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className='flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-white'
        style={{
          backgroundColor: '#ffffff',
          color: '#111827',
          border: '1px solid rgba(17, 24, 39, 0.08)',
        }}
      >
        <div className='shrink-0 px-5 pt-2'>
          <div className='mx-auto h-1 w-10 rounded-full bg-gray-200' />
        </div>

        <div className='flex shrink-0 items-center justify-between gap-3 px-5 py-4'>
          <h2 className='text-[18px] font-bold text-black'>{guide.title}</h2>

          <button
            type='button'
            onClick={onClose}
            className='flex h-9 w-9 items-center justify-center rounded-full text-black active:bg-gray-100'
            aria-label={guide.close}
            title={guide.close}
          >
            <X size={19} />
          </button>
        </div>

        <div
          className='min-h-0 flex-1 overflow-y-auto border-t border-gray-100 px-5 py-5'
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className='space-y-7'>
            {guide.sections.map((section) => (
              <section key={section.title} className='space-y-3'>
                <h3 className='text-[16px] font-bold leading-6 text-black'>
                  {section.title}
                </h3>

                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className='whitespace-pre-line text-[15px] leading-7 text-black'
                  >
                    {paragraph}
                  </p>
                ))}

                {section.examples?.map((example, index) => (
                  <GuidePlannerBlock
                    key={`${section.title}-example-${index}`}
                    example={example}
                  />
                ))}

                {section.steps && (
                  <ol className='space-y-2'>
                    {section.steps.map((step, index) => (
                      <li
                        key={step}
                        className='text-[15px] leading-7 text-black'
                      >
                        {index + 1}) {step}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
