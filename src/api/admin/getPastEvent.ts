import { Request, Response } from 'express';
import prisma from '../../prisma.js';
import { PastEventData, PastEventsResponse, PrismaEvent } from './types.js';

export const getPastEventsByClubController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { club_id } = req.query;
    console.log("club_id from query:", req.query.club_id);

    if (!club_id) {
      res.status(400).json({ message: "Club ID is required." });
      return;
    }

    const today = new Date();

    const pastEvents = await prisma.events.findMany({
      where: {
        date: {
          lt: today,
        },
        organizingclubs: {
          some: {
            club_id: Number(club_id),
          },
        },
      },
      include: {
        eventconvenors: {
          include: {
            users: {
              select: {
                name: true,
                department: true,
                yearofstudy: true,
              },
            },
          },
        },
        eventwinners: {
          include: {
            teams: {
              select: {
                name: true,
              },
            },
          },
        },
        feedback: true,
        eventregistration: true,
        teammembers: true,
      },
    }) as PrismaEvent[];

    const formattedData: PastEventData[] = pastEvents.map(event => {
      const average_rating = event.feedback.length
        ? event.feedback.reduce((acc: number, f) => acc + (f.rating || 0), 0) / event.feedback.length
        : 0;


      const eventConvenors = event.eventconvenors.map((ec) => ({
        name: ec.users?.name || null,
        department: ec.users?.department || null,
        yearofstudy: ec.users?.yearofstudy || null,
      }));

    
      const eventWinners = event.eventwinners.map((w) => ({
        position: w.position,
        team_name: w.teams?.name || null,
      }));

     
      const total_attendance = event.teammembers.filter(member => member.is_present).length;

      return {
        name: event.name,
        about: event.about,
        date: event.date,
        event_type: event.event_type,
        event_category: event.event_category,
        eventConvenors,
        eventWinners,
        average_rating: Number(average_rating.toFixed(2)),
        total_registered_teams: event.eventregistration.length,
        total_attendance,
      };
    });

    const response: PastEventsResponse = {
      message: "Past events details retrieved successfully.",
      data: formattedData,
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching past events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};