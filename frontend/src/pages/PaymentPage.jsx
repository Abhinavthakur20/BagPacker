import { useState } from "react";
import MainLayout from "../components/MainLayout";
import {
  bookingStatuses,
  formatINR,
  paymentGateways,
  paymentStatuses,
} from "../data/mockData";

export default function PaymentPage() {
  const [bookingForm, setBookingForm] = useState({
    travelerId: "",
    tripId: "",
    isBooked: true,
    totalAmount: 21200,
    status: "pending",
    paymentStatus: "pending",
    bookingDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    bookingId: "",
    amount: 21200,
    gateway: paymentGateways[0],
    status: "pending",
    transactionId: "",
    paidAt: "",
  });

  const method = paymentForm.gateway;

  return (
    <MainLayout>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-7">
          <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1500&q=80"
              alt="Kasol valley"
              className="h-52 w-full object-cover"
            />
            <div className="space-y-5 p-8">
              <h1 className="font-headline text-3xl font-extrabold text-primary">
                Finalize Your Expedition
              </h1>
              <div className="rounded-xl bg-surface-container-low p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-outline">
                  Booking Fields
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    placeholder="booking.travelerId (fk)"
                    value={bookingForm.travelerId}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        travelerId: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    placeholder="booking.tripId (fk)"
                    value={bookingForm.tripId}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        tripId: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    type="number"
                    placeholder="booking.totalAmount"
                    value={bookingForm.totalAmount}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        totalAmount: Number(e.target.value),
                      }))
                    }
                  />
                  <input
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    type="datetime-local"
                    placeholder="booking.bookingDate"
                    value={bookingForm.bookingDate}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        bookingDate: e.target.value,
                      }))
                    }
                  />
                  <select
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    value={bookingForm.status}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    {bookingStatuses.map((status) => (
                      <option key={status} value={status}>
                        booking.status = {status}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-lg bg-surface-container-high px-3 py-2"
                    value={bookingForm.paymentStatus}
                    onChange={(e) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        paymentStatus: e.target.value,
                      }))
                    }
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        booking.paymentStatus = {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p>Oct 14 - Oct 19, 2026</p>
                <p>02 Travelers</p>
                <p>Majnu-ka-Tilla, Delhi</p>
                <p>Gold Experience</p>
              </div>
              <div className="flex items-end justify-between border-t border-outline-variant/20 pt-5">
                <p className="text-on-surface-variant">Base price + permits</p>
                <p className="font-headline text-4xl font-black text-primary">
                  {formatINR(21200)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-xl">
            <h2 className="font-headline text-xl font-bold text-primary">
              Payment Fields
            </h2>
            <div className="mt-5 space-y-3">
              {paymentGateways.map((item) => (
                <label
                  key={item}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 ${method === item ? "border-primary bg-surface-container-low" : "border-transparent bg-surface-container-low"}`}
                >
                  <span className="font-bold text-primary">{item}</span>
                  <input
                    type="radio"
                    checked={method === item}
                    onChange={() =>
                      setPaymentForm((prev) => ({ ...prev, gateway: item }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-lg bg-surface-container-high px-3 py-2"
                placeholder="payment.bookingId (fk)"
                value={paymentForm.bookingId}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    bookingId: e.target.value,
                  }))
                }
              />
              <input
                className="rounded-lg bg-surface-container-high px-3 py-2"
                type="number"
                placeholder="payment.amount"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: Number(e.target.value),
                  }))
                }
              />
              <select
                className="rounded-lg bg-surface-container-high px-3 py-2"
                value={paymentForm.status}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    payment.status = {status}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg bg-surface-container-high px-3 py-2"
                placeholder="payment.transactionId"
                value={paymentForm.transactionId}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    transactionId: e.target.value,
                  }))
                }
              />
              <input
                className="rounded-lg bg-surface-container-high px-3 py-2"
                type="datetime-local"
                placeholder="payment.paidAt"
                value={paymentForm.paidAt}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paidAt: e.target.value,
                  }))
                }
              />
            </div>
            <button className="mt-6 w-full rounded-xl bg-linear-to-br from-primary to-primary-container py-4 font-headline text-lg font-bold text-white">
              Pay {formatINR(paymentForm.amount || 0)} Now
            </button>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}
