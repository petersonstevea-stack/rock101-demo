import { getMethodLessonsForInstrument } from "./methodLessons";

export type Instrument =
  | "guitar"
  | "bass"
  | "drums"
  | "keys"
  | "vocals";

export type CurriculumArea =
  | "graduation"
  | "requiredLessons"
  | "rehearsalReadiness";

export type CurriculumLocation = "privateLesson" | "groupRehearsal";

export type AllowedSigner = "instructor" | "director" | "either";

export type CurriculumItem = {
  id: string;
  label: string;
  description?: string;
  area: CurriculumArea;
  location: CurriculumLocation;
  allowedSigner: AllowedSigner;
  required: boolean;
};

export type CurriculumSection = {
  id: string;
  title: string;
  area: CurriculumArea;
  location: CurriculumLocation;
  allowedSigner: AllowedSigner;
  items: CurriculumItem[];
};

export type InstrumentCurriculum = {
  instrument: Instrument;
  displayName: string;
  graduationRequirements: CurriculumSection[];
  requiredLessons: CurriculumSection[];
  rehearsalReadiness: CurriculumSection[];
};

export type GroupedCurriculumItems = {
  id: string;
  title: string;
  items: CurriculumItem[];
};

function buildRequiredMethodLessonItems(
  instrument: Instrument
): CurriculumItem[] {
  return getMethodLessonsForInstrument(instrument).map((lesson) => ({
    id: lesson.id,
    label: lesson.title,
    description: lesson.description
      ? `${lesson.skillGroup} • ${lesson.description}`
      : lesson.skillGroup,
    area: "requiredLessons",
    location: "privateLesson",
    allowedSigner: "instructor",
    required: true,
  }));
}

const sharedRehearsalReadiness: CurriculumSection[] = [
  {
    id: "rehearsal-readiness-core",
    title: "Rehearsal Readiness",
    area: "rehearsalReadiness",
    location: "groupRehearsal",
    allowedSigner: "director",
    items: [
      {
        id: "prepared-for-rehearsal",
        label: "Comes to rehearsal prepared and having practiced",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "has-materials",
        label: "Has materials needed for rehearsal",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "rehearsal-etiquette",
        label: "Knows and follows rehearsal etiquette",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "positive-attitude",
        label: "Maintains a positive attitude in rehearsal",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "well-behaved",
        label: "Is well-behaved and focused during rehearsal",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "listens-to-instructors",
        label: "Listens to instructors and follows direction",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "listens-to-bandmates",
        label: "Listens to bandmates and plays as part of the group",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "no-noodling",
        label: "Avoids noodling or playing out of turn during instruction",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "plays-full-song-with-band",
        label: "Can play songs with the band all the way through",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
      {
        id: "follows-song-structure-in-band",
        label: "Can follow song form and transitions in a group setting",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        required: true,
      },
    ],
  },
];

export const rock101Curriculum: Record<Instrument, InstrumentCurriculum> = {
  guitar: {
    instrument: "guitar",
    displayName: "Guitar",
    graduationRequirements: [
      {
        id: "guitar-graduation-core",
        title: "Graduation Requirements",
        area: "graduation",
        location: "privateLesson",
        allowedSigner: "either",
        items: [
          {
            id: "guitar-musical-alphabet-e-a",
            label: "Knows the musical alphabet on E and A strings",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-power-chords",
            label: "Can play root/5 and/or inverted power chords",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-open-caged-chords",
            label: "Can play open CAGED chords",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-major-scale",
            label: "Can play the major scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-minor-pentatonic-scale",
            label: "Can play the minor pentatonic scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-i-iv-v",
            label: "Understands the I, IV, V concept and form",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-count-time",
            label:
              "Knows how to count time and basic note values (whole, half, quarter, eighth)",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-tuning-amp",
            label: "Can tune guitar and knows basic amp operation",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-song-maps",
            label: "Can make song maps and follow the basic structure of songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "guitar-rock101-proficiency",
            label: "Able to play Rock 101 songs with minimum level of proficiency",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
        ],
      },
    ],
    requiredLessons: [
      {
        id: "guitar-required-lessons-core",
        title: "Rock 101 Method App Lessons",
        area: "requiredLessons",
        location: "privateLesson",
        allowedSigner: "instructor",
        items: buildRequiredMethodLessonItems("guitar"),
      },
    ],
    rehearsalReadiness: sharedRehearsalReadiness,
  },

  bass: {
    instrument: "bass",
    displayName: "Bass",
    graduationRequirements: [
      {
        id: "bass-graduation-core",
        title: "Graduation Requirements",
        area: "graduation",
        location: "privateLesson",
        allowedSigner: "either",
        items: [
          {
            id: "bass-musical-alphabet-e-a",
            label: "Knows the musical alphabet on E and A strings",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-major-scale",
            label: "Can play the major scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-minor-pentatonic-scale",
            label: "Can play the minor pentatonic scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-walking-basslines",
            label: "Can play basic walking bass lines (major and minor)",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-count-time",
            label:
              "Knows how to count time and basic note values (whole, half, quarter, eighth)",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-i-iv-v",
            label: "Understands the I, IV, V concept and form",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-i-v-bassline",
            label: "Can play I-V bassline",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-tuning-amp",
            label: "Can tune bass and knows basic amp operation",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-song-maps",
            label: "Can make song maps and follow the basic structure of songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "bass-rock101-proficiency",
            label: "Able to play Rock 101 songs with minimum level of proficiency",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
        ],
      },
    ],
    requiredLessons: [
      {
        id: "bass-required-lessons-core",
        title: "Rock 101 Method App Lessons",
        area: "requiredLessons",
        location: "privateLesson",
        allowedSigner: "instructor",
        items: buildRequiredMethodLessonItems("bass"),
      },
    ],
    rehearsalReadiness: sharedRehearsalReadiness,
  },

  drums: {
    instrument: "drums",
    displayName: "Drums",
    graduationRequirements: [
      {
        id: "drums-graduation-core",
        title: "Graduation Requirements",
        area: "graduation",
        location: "privateLesson",
        allowedSigner: "either",
        items: [
          {
            id: "drums-play-in-time",
            label: "Can play in time",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-quarter-eighth-feel",
            label: "Can play quarter-note and eighth-note feels",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-basic-rock-beat",
            label: "Can play the basic rock beat with different kick patterns",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-count-time",
            label:
              "Knows how to count time and basic note values (whole, half, quarter, eighth)",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-basic-rudiments",
            label:
              "Can play basic rudiments such as single stroke roll, double stroke roll, and paradiddles",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-shuffle-beat",
            label: "Can play a shuffle beat",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-count-off-songs",
            label: "Can count off songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-maintain-tempo",
            label: "Can maintain tempo for 3 minutes minimum",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-fills-and-crashes",
            label: "Can play basic fills and crashes",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-song-maps",
            label: "Can make song maps and follow the basic structure of songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "drums-rock101-proficiency",
            label: "Able to play Rock 101 songs with minimum level of proficiency",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
        ],
      },
    ],
    requiredLessons: [
      {
        id: "drums-required-lessons-core",
        title: "Rock 101 Method App Lessons",
        area: "requiredLessons",
        location: "privateLesson",
        allowedSigner: "instructor",
        items: buildRequiredMethodLessonItems("drums"),
      },
    ],
    rehearsalReadiness: sharedRehearsalReadiness,
  },

  keys: {
    instrument: "keys",
    displayName: "Keys",
    graduationRequirements: [
      {
        id: "keys-graduation-core",
        title: "Graduation Requirements",
        area: "graduation",
        location: "privateLesson",
        allowedSigner: "either",
        items: [
          {
            id: "keys-musical-alphabet",
            label: "Knows the musical alphabet across the keyboard",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-major-minor-chords",
            label: "Can play major and minor chords",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-chord-inversions",
            label: "Can play chord inversions",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-major-minor-scales",
            label: "Can play the major scale and minor scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-both-hands",
            label: "Can play with both hands",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-i-iv-v",
            label: "Understands the I, IV, V concept and form",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-operate-keyboard",
            label: "Can operate keyboard, switch between sounds, and control volume",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-song-maps",
            label: "Can make song maps and follow the basic structure of songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "keys-rock101-proficiency",
            label: "Able to play Rock 101 songs with minimum level of proficiency",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
        ],
      },
    ],
    requiredLessons: [
      {
        id: "keys-required-lessons-core",
        title: "Rock 101 Method App Lessons",
        area: "requiredLessons",
        location: "privateLesson",
        allowedSigner: "instructor",
        items: buildRequiredMethodLessonItems("keys"),
      },
    ],
    rehearsalReadiness: sharedRehearsalReadiness,
  },

  vocals: {
    instrument: "vocals",
    displayName: "Vocals",
    graduationRequirements: [
      {
        id: "vocals-graduation-core",
        title: "Graduation Requirements",
        area: "graduation",
        location: "privateLesson",
        allowedSigner: "either",
        items: [
          {
            id: "vocals-mic-technique",
            label: "Knows proper mic technique",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-major-scale",
            label: "Can sing the major scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-minor-scale",
            label: "Can sing the minor scale",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: false,
          },
          {
            id: "vocals-sing-in-pitch",
            label: "Can sing in pitch",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-harmony-intervals",
            label: "Understands the concept of harmony and intervals",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-i-iv-v",
            label: "Understands the I, IV, V concept and form",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-memorize-lyrics",
            label: "Can memorize lyrics",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-song-maps",
            label: "Can make song maps and follow the basic structure of songs",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
          {
            id: "vocals-rock101-proficiency",
            label: "Able to play Rock 101 songs with minimum level of proficiency",
            area: "graduation",
            location: "privateLesson",
            allowedSigner: "either",
            required: true,
          },
        ],
      },
    ],
    requiredLessons: [
      {
        id: "vocals-required-lessons-core",
        title: "Rock 101 Method App Lessons",
        area: "requiredLessons",
        location: "privateLesson",
        allowedSigner: "instructor",
        items: buildRequiredMethodLessonItems("vocals"),
      },
    ],
    rehearsalReadiness: sharedRehearsalReadiness,
  },
};

export function getCurriculumByInstrument(instrument: string) {
  const normalized = instrument.toLowerCase() as Instrument;
  return rock101Curriculum[normalized];
}

export function getPrivateLessonSections(instrument: string) {
  const curriculum = getCurriculumByInstrument(instrument);
  if (!curriculum) return [];

  return [
    ...curriculum.graduationRequirements,
    ...curriculum.requiredLessons,
  ];
}

export function getGroupRehearsalSections(instrument: string) {
  const curriculum = getCurriculumByInstrument(instrument);
  if (!curriculum) return [];

  return curriculum.rehearsalReadiness;
}

export function getAllCurriculumItems(instrument: string) {
  const curriculum = getCurriculumByInstrument(instrument);
  if (!curriculum) return [];

  return [
    ...curriculum.graduationRequirements.flatMap((section) => section.items),
    ...curriculum.requiredLessons.flatMap((section) => section.items),
    ...curriculum.rehearsalReadiness.flatMap((section) => section.items),
  ];
}

export function groupCurriculumItemsBySkillGroup(
  items: CurriculumItem[]
): GroupedCurriculumItems[] {
  const groups = new Map<string, CurriculumItem[]>();

  for (const item of items) {
    const skillGroup = item.description?.split(" • ")[0]?.trim() || "Other";
    const existing = groups.get(skillGroup) ?? [];
    existing.push(item);
    groups.set(skillGroup, existing);
  }

  return Array.from(groups.entries()).map(([title, groupedItems], index) => ({
    id: `group-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    items: groupedItems,
  }));
}

export function getGroupedRequiredLessonSections(instrument: string) {
  const curriculum = getCurriculumByInstrument(instrument);
  if (!curriculum) return [];

  const requiredItems = curriculum.requiredLessons.flatMap(
    (section) => section.items
  );

  return groupCurriculumItemsBySkillGroup(requiredItems);
}
