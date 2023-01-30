"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const buttonsContainer = document.querySelector(".buttons");
const sortBtn = document.querySelector(".btn--sort");
const deleteAllBtn = document.querySelector(".btn--delete");
const modalWindow = document.querySelector(".modal");
const closeModal = document.querySelector(".modal__close");
const modalBtnNo = document.querySelector(".btn--no");
const modalBtnDeleteAll = document.querySelector(".btn--yes");
const heading = document.querySelector(".heading");

let isNewWorkout = true;

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = "cycling";

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 5.2, 24, 178);

// console.log(run1, cycling1);

////////////////////////////////////////////////
// APLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutId;
  #listItem;

  constructor() {
    // get user`s position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    deleteAllBtn.addEventListener("click", this._openModal);
    modalBtnNo.addEventListener("click", this._hideModal);
    closeModal.addEventListener("click", this._hideModal);
    modalBtnDeleteAll.addEventListener("click", this.reset);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          // Create Error message?
          alert("Could not get your position");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on("click", this._showDefaultForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showEditForm(workoutId) {
    isNewWorkout = false;

    console.log(workoutId);
    this.#workoutId = workoutId;

    let localStoredWorkouts = JSON.parse(localStorage.getItem("workouts"));

    const workoutItem = localStoredWorkouts.find(
      (workout) => workout.id === workoutId
    );

    inputDistance.value = workoutItem.distance;
    inputDuration.value = workoutItem.duration;

    if (workoutItem.type === "running") {
      inputType.value = "running";
      inputCadence.value = workoutItem.cadence;
    }

    if (workoutItem.type === "cycling") {
      inputType.value = "cycling";
      inputElevation.value = workoutItem.elevationGain;
    }

    this._toggleElevationFieldByType(workoutItem.type);

    form.classList.remove("hidden");
    heading.style.display = "none";
  }

  _showDefaultForm(mapE) {
    isNewWorkout = true;
    this._setFormDefaults();

    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    heading.style.display = "none";
    inputDistance.focus();
  }

  _hideForm() {
    this._setFormDefaults();

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _setFormDefaults() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    inputType.value = "running";
  }

  _toggleElevationFieldByType(type) {
    if (type === "running") {
      inputElevation.closest(".form__row").classList.add("form__row--hidden");
      inputCadence.closest(".form__row").classList.remove("form__row--hidden");
    } else {
      inputElevation
        .closest(".form__row")
        .classList.remove("form__row--hidden");
      inputCadence.closest(".form__row").classList.add("form__row--hidden");
    }
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let localStoredWorkouts = JSON.parse(localStorage.getItem("workouts"));
    let lat;
    let lng;

    if (isNewWorkout) {
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    }

    if (!isNewWorkout) {
      let foundWorkout = localStoredWorkouts.find(
        (workout) => workout.id === this.#workoutId
      );
      let { foundLat, foundLng } = foundWorkout.coords;
      lat = foundLat;
      lng = foundLng;
    }

    // const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    if (isNewWorkout) {
      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as a marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Set local storage to all workouts
      this._setLocalStorage();
    } else {
      workout.id = foundWorkout.id;

      let foundWorkoutIndex = localStoredWorkouts.findIndex(
        (workout) => workout.id === this.#workoutId
      );

      localStoredWorkouts[foundWorkoutIndex] = workout;

      this._renderWorkout(workout);

      this._setLocalStorage();
    }

    // Hide form + Clear input fields
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️ " : "🚴‍♂️ "} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    buttonsContainer.classList.remove("hidden");

    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️ " : "🚴‍♂️ "
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === "running")
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          `;

    if (workout.type === "cycling")
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🗻</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        `;

    html += `<div class="workout__editing">
    <button class="workout__edit">Edit</button>
    <button class="workout__delete">Delete</button>
    </div>
    </li>`;

    if (isNewWorkout) form.insertAdjacentHTML("afterend", html);
    if (!isNewWorkout) {
      let list = this.#listItem;
      let newList = document.createElement(`li`);
      newList.innerHTML = html;
      list.parentNode.replaceChild(newList, list);
    }

    const deleteBtn = document.querySelector(".workout__delete");
    const editBtn = document.querySelector(".workout__edit");
    let li = document.querySelector("li");

    deleteBtn.addEventListener("click", this._deleteWorkout.bind(this));
    editBtn.addEventListener("click", this._editWorkout.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  _openModal() {
    modalWindow.style.opacity = 1;
    modalWindow.style.visibility = "visible";
  }

  _hideModal() {
    modalWindow.style.opacity = 0;
    modalWindow.style.visibility = "hidden";
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();

    this._hideModal();

    heading.style.display = "inline";
  }

  _deleteWorkout(e) {
    // find id of clicked item
    const workoutItem = e.target.closest(".workout");
    const workoutID = workoutItem.dataset.id;

    // // find item in local storage by id
    let localStoredWorkouts = JSON.parse(localStorage.getItem("workouts"));

    const workoutIndex = localStoredWorkouts.findIndex(
      (workout) => workout.id === workoutID
    );

    // // delete item from local storage
    localStoredWorkouts.splice(workoutIndex, 1);

    // hide btns sort and delete when local storage is empty
    if (localStoredWorkouts.length === 0)
      buttonsContainer.classList.add("hidden");

    localStoredWorkouts = JSON.stringify(localStoredWorkouts);
    localStorage.setItem("workouts", localStoredWorkouts);

    // delete item from sidebar
    workoutItem.remove();

    // reload map
    location.reload();
  }

  _editWorkout(e) {
    // find item wich has been clicked to edit
    this.#listItem = e.target.closest(".workout");
    const workoutID = this.#listItem.dataset.id;

    // show form to input new values
    this._showEditForm(workoutID);

    // submit for and renew the value
  }
}

const app = new App();
