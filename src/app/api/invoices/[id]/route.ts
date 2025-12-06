import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            address: true,
            city: true,
            zipCode: true,
            phone: true,
          },
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        company: true,
        items: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, ...invoiceData } = body;

    // Calculate totals if items are provided
    let totalHT = 0;
    let total = 0;

    if (items) {
      items.forEach((item: any) => {
        const itemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
        totalHT += itemTotal;
        total += itemTotal * (1 + (item.tax || 0) / 100);
      });
    }

    // Delete existing items and create new ones
    if (items) {
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: params.id },
      });
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...invoiceData,
        startDate: invoiceData.startDate ? new Date(invoiceData.startDate) : undefined,
        endDate: invoiceData.endDate ? new Date(invoiceData.endDate) : undefined,
        paymentDate: invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : undefined,
        subscriptionMonths: invoiceData.subscriptionMonths
          ? JSON.stringify(invoiceData.subscriptionMonths)
          : undefined,
        totalHT: items ? totalHT : undefined,
        total: items ? total : undefined,
        items: items
          ? {
              create: items.map((item: any) => ({
                internRef: item.internRef,
                product: item.product,
                price: item.price,
                quantity: item.quantity,
                description: item.description,
                discount: item.discount || 0,
                unite: item.unite,
                tax: item.tax || 0,
                groupId: item.groupId,
              })),
            }
          : undefined,
      },
      include: {
        client: true,
        employee: true,
        items: {
          include: {
            group: true,
          },
        },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.invoice.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
