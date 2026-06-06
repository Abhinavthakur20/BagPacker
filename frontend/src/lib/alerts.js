import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const noticeTimers = {
  success: 3200,
  info: 3200,
  warning: 3800,
  error: 4600,
};

const commonClasses = {
  popup: "bagpacker-swal-popup",
  title: "bagpacker-swal-title",
  htmlContainer: "bagpacker-swal-text",
  confirmButton: "bagpacker-swal-confirm",
  cancelButton: "bagpacker-swal-cancel",
};

const showNotice = ({ icon, title, text = "", confirmButtonText = "Okay" }) =>
  Swal.fire({
    icon,
    title,
    text,
    toast: true,
    position: "top-end",
    width: "36rem",
    showConfirmButton: false,
    showCloseButton: true,
    timer: noticeTimers[icon] || noticeTimers.info,
    timerProgressBar: true,
    confirmButtonText,
    heightAuto: false,
    returnFocus: false,
    scrollbarPadding: false,
    customClass: {
      ...commonClasses,
      popup: "bagpacker-swal-popup bagpacker-swal-toast",
    },
  });

export function showSuccessAlert(title, text = "") {
  return showNotice({ icon: "success", title, text });
}

export function showErrorAlert(title, text = "") {
  return showNotice({ icon: "error", title, text, confirmButtonText: "Close" });
}

export function showInfoAlert(title, text = "") {
  return showNotice({ icon: "info", title, text, confirmButtonText: "Got it" });
}

export function showConfirmAlert({
  title,
  text,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  tone = "warning",
  icon,
}) {
  return Swal.fire({
    icon: icon || tone,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    heightAuto: false,
    returnFocus: false,
    scrollbarPadding: false,
    customClass: commonClasses,
  });
}
