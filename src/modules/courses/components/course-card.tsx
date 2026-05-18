// CourseCard: card del dashboard que representa un curso enrolled.
// Server Component, sin estado. Click "Entrar al curso" navega al
// detalle de curso /learn/[courseId].
//
// description line-clamp-3 evita cards desproporcionados cuando el
// admin carga textos largos. Si se necesita ver el detalle completo,
// es dentro del course page.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Course } from "../types";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-1">
        <CardTitle>{course.title}</CardTitle>
        {course.description && (
          <CardDescription className="line-clamp-3">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href={`/learn/${course.id}`}>
            Entrar al curso
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
