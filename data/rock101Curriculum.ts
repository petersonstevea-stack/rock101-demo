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

export type CurriculumMonth = 1 | 2 | 3 | 4;

export const ROCK101_MONTH_LABELS: Record<CurriculumMonth, string> = {
    1: "Month 1 - Foundations",
    2: "Month 2 - Musical Skills",
    3: "Month 3 - Band Readiness",
    4: "Month 4 - Reinforcement",
};

export type CurriculumItem = {
    id: string;
    label: string;
    description?: string;
    area: CurriculumArea;
    location: CurriculumLocation;
    allowedSigner: AllowedSigner;
    required: boolean;
    month?: CurriculumMonth;
    monthLabel?: string;
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

function normalizeTitle(value: string) {
    return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function withMonth(
    item: Omit<CurriculumItem, "month" | "monthLabel">,
    month: CurriculumMonth
): CurriculumItem {
    return {
        ...item,
        month,
        monthLabel: ROCK101_MONTH_LABELS[month],
    };
}

const methodLessonMonthMap: Record<Instrument, Record<CurriculumMonth, string[]>> = {
    guitar: {
        1: [
            "Natural Notes on the E String (Rock 101)",
            "Natural Notes on the A String (Rock 101)",
            "Chromatic Notes on the E and A Strings (Rock 101)",
            "Power Chords #2 (Bk 1, Pg 6.3)",
            "12 Bar Blues in A (Bk 1, Pg 9.1)",
            "12 Bar Blues in E (Bk 1, Pg 12.1)",
            "Fretted Power Chords on the 5th String (Bk 1, Pg 16.1)",
            "Reading Whole, Half and Quarter Notes (Bk 1, Pg 17.1)",
            "Slash Notation with Open Chords #1 (Bk 1, Pg 19.1)",
            "Slash Notation with Open Chords #2 (Bk 1, Pg 19.2)",
        ],
        2: [
            "C Major Scale (Bk 1, Pg 21.1)",
            "Three-String Power Chords (Bk 1, Pg 24.1)",
            "Palm Muted Power Chords (Bk 1, Pg 24.2)",
            "Eighth Note Alternate Strumming (Bk 1, Pg 28.1)",
            "Common Eighth Note Strumming Pattern Exercise #1 (Bk 1, Pg 28.2)",
            "8th Note Reading Exercise (Bk 1, Pg 29.1)",
            "Moveable Minor Pentatonic Form (Bk 1, Pg 31.1)",
            "Minor Pentatonic Sequence #2 (Bk 1, Pg 31.3)",
            "Inverted Power Chords #1 (Bk 1, Pg 32.1)",
            "Inverted Power Chords #2 (Bk 1, Pg 32.2)",
            "Open E Major and A Major Chords (Bk 1, Pg 36.1)",
            "Open Chord E-A-D Strumming Exercise (Bk 1, Pg 36.2)",
            "Reading Rests #1 (Bk 1, Pg 38.1)",
            "Reading Rests #2 (Bk 1, Pg 38.2)",
            "Open Minor Chords (Bk 1, Pg 39.1)",
            "Minor Chords in Major Keys (Bk 1, Pg 39.2)",
            "Major and Minor Chords Together (Bk 1, Pg 40.1)",
            "E Minor Pentatonic Scale (Bk 1, Pg 15.1)",
        ],
        3: [
            "Minor Blues Progression (Bk 1, Pg 42.1)",
            "Am Blues with Riff (Bk 1, Pg 43.1)",
            "Chord Chart Reading Finale (Bk 1, Pg 47.1)",
            "Major Scale: E Form #1 (Bk 2, Pg 7.1)",
            "Common Chord Progressions: I-IV-V #1 (Bk 2 Pg 16.1)",
            "Blues in A -120 BPM",
            "Blues in A - 120 BPM",
        ],
        4: [],
    },

    bass: {
        1: [
            "Natural Notes on the E String (Rock 101)",
            "Natural Notes on the A String (Rock 101)",
            "Chromatic Notes on the E and A Strings (Rock 101)",
            "Simple Bassline Using Notes from the E and A Strings (Bk 1, Pg 10.1)",
            "Another Simple Bassline Using Notes from E and A Strings (Bk 1, Pg 10.2)",
            "Bassline Using Natural Notes from the E and A Strings (Bk 1, Pg 12.1)",
            "Playing Your First Notes in Time (Bk 1, Pg 9.3)",
            "Counting Eighth Notes (Bk 1, Pg 20.2)",
            "Locking In with the Drums (Bk 1, Pg 21.2)",
        ],
        2: [
            "C Major Scale on One String (Bk 1, Pg 22.1)",
            "G Major Scale Closed Fingering (Bk 1, Pg 22.4)",
            "G Major Scale Bassline (Bk 1, Pg 23.2)",
            "C Major Scale Bassline (Bk 1, Pg 24.1)",
            "Chord Progressions (Root Motion) over I-IV-V (Bk 1, Pg 25.1)",
            "Chord Progressions (Root Motion) Over I-IV-V #2 (Bk 1, Pg 25.1)",
            "Root and Fifth Groove with Dotted Notes and Ties (Bk 1, Pg 25.2)",
            "Beats One and Three (Bk 1, Pg 28.1)",
            "Eighth Note Major Triad Pattern Emphasizing Beats One and Three (Bk 1, Pg 29.1)",
            "Locking in with Bass Drum Beats 1 and 3 (Bk 1, Pg 30.1)",
            "G Major Scale Using Open Strings (Relative Major) (Bk 1, Pg 33.1)",
            "E Minor Pentatonic Scale (Rock 101)",
            "Minor Pentatonic Scale Pattern (Rock 101)",
            "I-V bassline in C (Rock 101)",
            "I-V bassline in D (Rock 101)",
        ],
        3: [
            "Locking in with a Drummer: 16th-Note Groove (Bk 1, Pg 42.1)",
            "Warm Up: Moveable Major Triad Fingering (Bk 1, Pg 45.1)",
            "Major and Minor: Open Triad Fingering Exercise (Bk 1, Pg 46.1)",
            "Major and Minor: Open and Closed triad Fingering Exercise (Bk 1, Pg 46.2)",
            "Bassline Using Major and Minor Triads (Bk 1, Pg 47.1)",
            "Ascending and Descending Bassline (Bk 3, Pg 17.2)",
            "Major Scale Fingering 13-34-13-34 (Bk 2, Pg 33.1)",
            "Major Scale Fingering 4134-4134 (Bk 2, Pg 33.2)",
            "Blues in A - 120 BPM",
        ],
        4: [],
    },

    drums: {
        1: [
            "Song Form and Counting #1 (Bk 1, Pg 12.1)",
            "Snare Drum Variations #1 (Bk 1, Pg 13.1)",
            "Double Stroke Roll #1 (Bk 1, Pg 13.2)",
            "Single and Double Stroke Roll Variations (Bk 1, Pg 14.1)",
            "Intro to Whole Notes and Half Notes (Bk 1, Pg 22)",
            "The Paradiddle #1 (Bk 1, Pg 25.1)",
            "The Paradiddle #2 (Bk 1, Pg 25.2)",
            "The Paradiddle #4 (Bk 1, Pg 26.1)",
            "Eighth Notes on the Hi-Hat #1 (Bk 1, Pg 28.1)",
            "Playing Eighth Note Rhythms on the Bass Drum #1 (Bk 1, Pg 30.1)",
            "Single Stroke Roll (Bk 1, Pg 5.1)",
        ],
        2: [
            "The Crash #1 (Bk 1, Pg 35.3)",
            "The Crash #2 (Bk 1, Pg 36.1)",
            "The Crash #4 (Bk 1, Pg 36.3)",
            "Introducing Drum Fills #2 (Bk 1, Pg 43.2)",
            "Using the Crash in Fills (Bk 1, Pg 44.1)",
            "Orchestrating the Eighth-Note Drum Fills #1 (Bk 1, Pg 44.2)",
            "Additional Eighth-Note Drum Fills #4 (Bk 1, Pg 45.2)",
            "Eighth Note Reading Exercise (Bk 1, Pg 47.2)",
        ],
        3: [
            "The Shuffle Beat (Bk 3, Pg 10.1)",
            "Basic Shuffle Beat (Rock 101)",
            "Stamina Test #1 (Rock 101)",
            "Stamina Test #2 (Rock 101)",
            "Blues in A - 120 BPM",
        ],
        4: [],
    },

    keys: {
        1: [
            "Natural Notes on the Keyboard (Rock 101)",
            "Chromatic Notes on the Keyboard (Rock 101)",
            "C Major Scale (Bk 1, Pg 13.1)",
            "G Major Scale (Bk 1, Pg 15.1)",
            "D Major Scale (Bk 1, Pg 15.2)",
            "A Major Scale (Bk 1, Pg 15.3)",
            "E Major Scale (Bk 1, Pg 15.4)",
            "Practicing Rhythm with C, F, and G Chords (Bk 1, Pg 19.1)",
            "Reading Mixed Rhythms (Bk 1, Pg 20.1)",
        ],
        2: [
            "Chord Chart with Rhythm (Bk 1, Pg 26.1)",
            "Major and Minor Chords with Bass Notes (Bk 1, Pg 28.1)",
            "Chords and Melody Using Two Hands (Bk 1, Pg 29.2)",
            "C Major Scale in Two Octaves: Right Hand (Bk 1, Pg 31.2)",
            "C Major Scale in Two Octaves: Left Hand (Bk 1, Pg 31.3)",
            "Melody with Rests (Bk 1, Pg 32.1)",
            "Reading Intervals (Bk 1, Pg 37.1)",
            "Rhythmic Independence #1 (Bk 1, Pg 43.1)",
            "Pedal Tone (Bk 1, Pg 44.1)",
            "E Minor Pentatonic Exercise with Ties and Accents (Bk 1, Pg 46.1)",
            "12 Bar Blues: Chords in Both Hands (Bk 1, Pg 47.1)",
            "Major Chords on All Roots #1 (Bk 2, Pg 9.1)",
            "Major Chords on All Roots #2 (Bk 2, Pg 10.1)",
            "Minor Chords On All Roots #1 (Bk 2, Pg 16.1)",
            "Minor Chords on All Roots #2 (Rock 101)",
            "Learning Inversions (Bk 2, Pg 19.1)",
            "I, IV, V Chords Using Inversions (Bk 2, Pg 22.1)",
        ],
        3: [
            "Two-Octave C Minor Scale (Bk 2, Pg 4.1)",
            "Various Minor Scales (Rock 101)",
            "Common Chord Progression I-IV-V (Rock 101)",
            "Blues in A - 120 BPM",
        ],
        4: [],
    },

    vocals: {
        1: [
            "Total Breath Exercise (Bk 1, Pg 5.1)",
            "Diphthongs (Bk 1, Pg 11.2)",
            "Warm Up: Intervals (Bk 1, Pg 12.1)",
            "Introduction to Sightreading (Bk 1, Pg 21.1)",
            "Major Scale (Bk 1, Pg 24.1)",
            "Sightreading Eighth Notes (Bk 1, Pg 26.1)",
            "Sightreading Exercise in 3/4 Time (Bk 1, Pg 30.1)",
            "Diatonic Intervals (Bk 1, Pg 34.1)",
            "Review of Diatonic Intervals (Bk 1, Pg 35.1)",
            "Solfege Up and Down (Bk 1, Supplemental)",
        ],
        2: [
            "Minor Scale Solfege (Bk 1, Supplemental)",
            "Chromatic Scales, Intervals (Bk 1, Pg 28.1)",
            "Intervals, Perfect 5th and Octave (Bk 2, 15.2)",
            "Solfege and Chord Construction (Bk 3, Pg 23.1)",
        ],
        3: [
            "The Blues Scale (Bk 2, Pg 34.1)",
            "The Blues in E (Rock 101)",
            "Blues in A - 120 BPM",
            "Sirens & Mic Technique (Rock 101)",
        ],
        4: [],
    },
};

function getMethodLessonMonth(
    instrument: Instrument,
    lessonTitle: string,
    lessonDescription?: string
): CurriculumMonth {
    const combinedTitle = lessonDescription?.trim()
        ? `${lessonTitle} (${lessonDescription})`
        : lessonTitle;

    const normalizedCombinedTitle = normalizeTitle(combinedTitle);
    const normalizedLessonTitle = normalizeTitle(lessonTitle);

    for (const month of [1, 2, 3, 4] as CurriculumMonth[]) {
        const monthTitles = methodLessonMonthMap[instrument][month] ?? [];

        const hasMatch = monthTitles.some((title) => {
            const normalizedMappedTitle = normalizeTitle(title);
            return (
                normalizedMappedTitle === normalizedCombinedTitle ||
                normalizedMappedTitle === normalizedLessonTitle
            );
        });

        if (hasMatch) {
            return month;
        }
    }

    return 4;
}

function buildRequiredMethodLessonItems(
    instrument: Instrument
): CurriculumItem[] {
    return getMethodLessonsForInstrument(instrument).map((lesson) => {
        const month = getMethodLessonMonth(
            instrument,
            lesson.title,
            lesson.description
        );

        return {
            id: lesson.id,
            label: lesson.title,
            description: lesson.description
                ? `${lesson.skillGroup} • ${lesson.description}`
                : lesson.skillGroup,
            area: "requiredLessons",
            location: "privateLesson",
            allowedSigner: "instructor",
            required: true,
            month,
            monthLabel: ROCK101_MONTH_LABELS[month],
        };
    });
}

const sharedRehearsalReadiness: CurriculumSection[] = [
    {
        id: "rehearsal-readiness-core",
        title: "Rehearsal Readiness",
        area: "rehearsalReadiness",
        location: "groupRehearsal",
        allowedSigner: "director",
        items: [
            withMonth(
                {
                    id: "prepared-for-rehearsal",
                    label: "Comes to rehearsal prepared and having practiced",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "has-materials",
                    label: "Has materials needed for rehearsal",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "rehearsal-etiquette",
                    label: "Knows and follows rehearsal etiquette",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "positive-attitude",
                    label: "Maintains a positive attitude in rehearsal",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "well-behaved",
                    label: "Is well-behaved and focused during rehearsal",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "listens-to-instructors",
                    label: "Listens to instructors and follows direction",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                1
            ),
            withMonth(
                {
                    id: "listens-to-bandmates",
                    label: "Listens to bandmates and plays as part of the group",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                2
            ),
            withMonth(
                {
                    id: "no-noodling",
                    label: "Avoids noodling or playing out of turn during instruction",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                2
            ),
            withMonth(
                {
                    id: "plays-full-song-with-band",
                    label: "Can play songs with the band all the way through",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                3
            ),
            withMonth(
                {
                    id: "follows-song-structure-in-band",
                    label: "Can follow song form and transitions in a group setting",
                    area: "rehearsalReadiness",
                    location: "groupRehearsal",
                    allowedSigner: "director",
                    required: true,
                },
                3
            ),
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
                    withMonth(
                        {
                            id: "guitar-musical-alphabet-e-a",
                            label: "Knows the musical alphabet on E and A strings",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "guitar-power-chords",
                            label: "Can play root/5 and/or inverted power chords",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "guitar-open-caged-chords",
                            label: "Can play open CAGED chords",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "guitar-major-scale",
                            label: "Can play the major scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "guitar-minor-pentatonic-scale",
                            label: "Can play the minor pentatonic scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "guitar-i-iv-v",
                            label: "Understands the I, IV, V concept and form",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "guitar-count-time",
                            label:
                                "Knows how to count time and basic note values (whole, half, quarter, eighth)",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "guitar-tuning-amp",
                            label: "Can tune guitar and knows basic amp operation",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "guitar-song-maps",
                            label: "Can make song maps and follow the basic structure of songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "guitar-rock101-proficiency",
                            label: "Able to play Rock 101 songs with minimum level of proficiency",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        4
                    ),
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
                    withMonth(
                        {
                            id: "bass-musical-alphabet-e-a",
                            label: "Knows the musical alphabet on E and A strings",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "bass-major-scale",
                            label: "Can play the major scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "bass-minor-pentatonic-scale",
                            label: "Can play the minor pentatonic scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "bass-walking-basslines",
                            label: "Can play basic walking bass lines (major and minor)",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "bass-count-time",
                            label:
                                "Knows how to count time and basic note values (whole, half, quarter, eighth)",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "bass-i-iv-v",
                            label: "Understands the I, IV, V concept and form",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "bass-i-v-bassline",
                            label: "Can play I-V bassline",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "bass-tuning-amp",
                            label: "Can tune bass and knows basic amp operation",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "bass-song-maps",
                            label: "Can make song maps and follow the basic structure of songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "bass-rock101-proficiency",
                            label: "Able to play Rock 101 songs with minimum level of proficiency",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        4
                    ),
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
                    withMonth(
                        {
                            id: "drums-play-in-time",
                            label: "Can play in time",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "drums-quarter-eighth-feel",
                            label: "Can play quarter-note and eighth-note feels",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "drums-basic-rock-beat",
                            label: "Can play the basic rock beat with different kick patterns",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "drums-count-time",
                            label:
                                "Knows how to count time and basic note values (whole, half, quarter, eighth)",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "drums-basic-rudiments",
                            label:
                                "Can play basic rudiments such as single stroke roll, double stroke roll, and paradiddles",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "drums-shuffle-beat",
                            label: "Can play a shuffle beat",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "drums-count-off-songs",
                            label: "Can count off songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "drums-maintain-tempo",
                            label: "Can maintain tempo for 3 minutes minimum",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "drums-fills-and-crashes",
                            label: "Can play basic fills and crashes",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "drums-song-maps",
                            label: "Can make song maps and follow the basic structure of songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "drums-rock101-proficiency",
                            label: "Able to play Rock 101 songs with minimum level of proficiency",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        4
                    ),
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
                    withMonth(
                        {
                            id: "keys-musical-alphabet",
                            label: "Knows the musical alphabet across the keyboard",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "keys-major-minor-chords",
                            label: "Can play major and minor chords",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "keys-chord-inversions",
                            label: "Can play chord inversions",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "keys-major-minor-scales",
                            label: "Can play the major scale and minor scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "keys-both-hands",
                            label: "Can play with both hands",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "keys-i-iv-v",
                            label: "Understands the I, IV, V concept and form",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "keys-operate-keyboard",
                            label: "Can operate keyboard, switch between sounds, and control volume",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "keys-song-maps",
                            label: "Can make song maps and follow the basic structure of songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "keys-rock101-proficiency",
                            label: "Able to play Rock 101 songs with minimum level of proficiency",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        4
                    ),
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
                    withMonth(
                        {
                            id: "vocals-mic-technique",
                            label: "Knows proper mic technique",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "vocals-major-scale",
                            label: "Can sing the major scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "vocals-minor-scale",
                            label: "Can sing the minor scale",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: false,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "vocals-sing-in-pitch",
                            label: "Can sing in pitch",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        1
                    ),
                    withMonth(
                        {
                            id: "vocals-harmony-intervals",
                            label: "Understands the concept of harmony and intervals",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        2
                    ),
                    withMonth(
                        {
                            id: "vocals-i-iv-v",
                            label: "Understands the I, IV, V concept and form",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "vocals-memorize-lyrics",
                            label: "Can memorize lyrics",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "vocals-song-maps",
                            label: "Can make song maps and follow the basic structure of songs",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        3
                    ),
                    withMonth(
                        {
                            id: "vocals-rock101-proficiency",
                            label: "Able to play Rock 101 songs with minimum level of proficiency",
                            area: "graduation",
                            location: "privateLesson",
                            allowedSigner: "either",
                            required: true,
                        },
                        4
                    ),
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