import { AppUser } from "@/types/user";

export const users: AppUser[] = [
  {
    email: "owner@rock101.com",
    name: "Steve",
    role: "owner",
    status: "active",
  },
  {
    email: "gm.delmar@rock101.com",
    name: "Del Mar GM",
    role: "generalManager",
    status: "active",
    schoolId: "del-mar",
  },
  {
    email: "gm.encinitas@rock101.com",
    name: "Encinitas GM",
    role: "generalManager",
    status: "active",
    schoolId: "encinitas",
  },
  {
    email: "gm.scripps@rock101.com",
    name: "Scripps Ranch GM",
    role: "generalManager",
    status: "active",
    schoolId: "scripps-ranch",
  },
  {
    email: "director.delmar@rock101.com",
    name: "Del Mar Director",
    role: "director",
    status: "active",
    schoolId: "del-mar",
  },
  {
    email: "director.encinitas@rock101.com",
    name: "Encinitas Director",
    role: "director",
    status: "active",
    schoolId: "encinitas",
  },
  {
    email: "director.scripps@rock101.com",
    name: "Scripps Ranch Director",
    role: "director",
    status: "active",
    schoolId: "scripps-ranch",
  },
  {
    email: "jennifer@gmail.com",
    name: "Jennifer",
    role: "instructor",
    status: "active",
    schoolId: "del-mar",
  },
  {
    email: "mike@yahoo.com",
    name: "Mike",
    role: "instructor",
    status: "active",
    schoolId: "encinitas",
  },
  {
    email: "zoeparent@example.com",
    name: "Zoe's Parent",
    role: "parent",
    status: "active",
    schoolId: "del-mar",
  },
];