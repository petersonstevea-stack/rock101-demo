import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

type StudentLessonProgressMap = Record<string, boolean>;

type StudentLessonProgressRecord = {
  studentId: string;
  lessons: StudentLessonProgressMap;
  updatedAt: string;
};

function getKey(studentId: string) {
  return `student-progress:${studentId}`;
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const redis = getRedis();

    if (!redis) {
      return NextResponse.json({
        studentId,
        lessons: {},
        updatedAt: new Date().toISOString(),
      });
    }

    const existing = await redis.get<StudentLessonProgressRecord>(getKey(studentId));

    return NextResponse.json(
      existing ?? {
        studentId,
        lessons: {},
        updatedAt: new Date().toISOString(),
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load progress" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const body = await request.json();

    const payload: StudentLessonProgressRecord = {
      studentId,
      lessons: body.lessons ?? {},
      updatedAt: new Date().toISOString(),
    };

    const redis = getRedis();

    if (!redis) {
      return NextResponse.json(payload);
    }

    await redis.set(getKey(studentId), payload);

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Unable to save progress" },
      { status: 500 }
    );
  }
}