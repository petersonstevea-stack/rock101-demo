export const skillSections = {
  instrument: {
    title: "Instrument Skills",
    items: [
      "Hold pick correctly",
      "Play single-note riffs",
      "Switch basic chord shapes",
      "Maintain steady downstrokes",
      "Play eighth-note rhythm",
      "Mute unused strings",
      "Follow song structure",
      "Enter at correct time",
    ],
  },
  concepts: {
    title: "Music Concepts",
    items: [
      "Count quarter and eighth notes",
      "Recognize verse / chorus",
      "Understand dynamics",
      "Recognize tempo",
      "Follow band cues",
    ],
  },
  assignments: {
    title: "Lesson Assignments + Demonstration",
    items: [
      "Completed weekly lesson assignment",
      "Demonstrates correct technique",
      "Demonstrates rhythm exercise",
      "Explains song structure",
      "Prepared for lesson",
    ],
  },
  practicePerformance: {
    title: "Practice + Performance Skills",
    items: [
      "Practices assigned material",
      "Performs part consistently",
      "Stays with the band",
      "Recovers from mistakes",
      "Shows stage awareness",
    ],
  },
  groupBehavior: {
    title: "Group Behavior + Maturity",
    items: [
      "Arrives prepared",
      "No noodling during instruction",
      "Respects bandmates",
      "Listens to direction",
      "Shows maturity in rehearsal",
    ],
  },
} as const;

export const allCurriculumItems = Object.values(skillSections).flatMap(
  (section) => section.items
);