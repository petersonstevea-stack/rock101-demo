import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

type StudentLessonProgressMap = Record<string, boolean>;

type StudentLessonProgressRecord = {
  studentId: string;
  lessons: StudentLessonProgressMap;
  updatedAt: string;
};

function getKey(studentId: string) {
  return `student-progress:${studentId}`;
}

export async function GET(
  _request: Request,
  { params }: { params: { studentId: string } }
) {
  const existing = await redis.get<StudentLessonProgressRecord>(
    getKey(params.studentId)
  );

  return NextResponse.json(
    existing ?? {
      studentId: params.studentId,
      lessons: {},
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  const body = await request.json();

  const payload: StudentLessonProgressRecord = {
    studentId: params.studentId,
    lessons: body.lessons ?? {},
    updatedAt: new Date().toISOString(),
  };

  await redis.set(getKey(params.studentId), payload);

  return NextResponse.json(payload);
}