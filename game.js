let gameStarted = false;
document.getElementById('startButton').addEventListener('click', () => {
  document.getElementById('startMenu').style.display = 'none';
  gameStarted = true;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const listener = new THREE.AudioListener();
camera.add(listener);

const shootSound = new THREE.Audio(listener);
const hitSound = new THREE.Audio(listener);
const deathSound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('sounds/shoot.mp3', buffer => shootSound.setBuffer(buffer));
audioLoader.load('sounds/hit.mp3', buffer => hitSound.setBuffer(buffer));
audioLoader.load('sounds/death.mp3', buffer => deathSound.setBuffer(buffer));

const player = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
scene.add(player);

let enemies = [];

function spawnEnemy() {
  const enemy = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  enemy.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 12, -10);
  scene.add(enemy);
  enemies.push(enemy);
}

setInterval(spawnEnemy, 1500);

let killCount = 0;
let hasSword = false;
let slowMoTimer = 0;

let swordModel;
const loader = new THREE.GLTFLoader();

loader.load('models/sword.glb', gltf => {
  swordModel = gltf.scene;
  swordModel.scale.set(0.5, 0.5, 0.5);
  swordModel.position.set(0, -0.5, -1);
}, undefined, error => {
  console.error("Error loading sword model:", error);
});

function shoot() {
  if (!gameStarted) return;

  shootSound.isPlaying && shootSound.stop();
  shootSound.play();

  const raycaster = new THREE.Raycaster();
  raycaster.set(player.position, new THREE.Vector3(0, 0, -1));
  const intersects = raycaster.intersectObjects(enemies);

  if (intersects.length > 0) {
    hitSound.isPlaying && hitSound.stop();
    hitSound.play();

    scene.remove(intersects[0].object);
    enemies.splice(enemies.indexOf(intersects[0].object), 1);
    killCount++;

    if (killCount === 10 && !hasSword) {
      hasSword = true;
      slowMoTimer = 10;
      alert("Sword Unlocked! Time slowed for 10 seconds.");
      if (swordModel) player.add(swordModel);
    }
  }
}

document.addEventListener('click', shoot);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && hasSword) {
    if (swordModel) {
      swordModel.rotation.z = Math.random() * 1.5 - 0.75;
      setTimeout(() => swordModel.rotation.z = 0, 300);
    }
    enemies = enemies.filter(enemy => {
      if (enemy.position.distanceTo(player.position) < 3) {
        scene.remove(enemy);
        killCount++;
        return false;
      }
      return true;
    });
  }
});

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  if (!gameStarted) return;

  let now = performance.now();
  let delta = (now - lastTime) / 1000;
  lastTime = now;

  if (slowMoTimer > 0) {
    slowMoTimer -= delta;
    if (slowMoTimer <= 0) {
      slowMoTimer = 0;
      alert("Slow-mo over! Stay sharp.");
    }
  }

  let moved = false;
  if (keys['w']) { player.position.y += delta * 2; moved = true; }
  if (keys['s']) { player.position.y -= delta * 2; moved = true; }
  if (keys['a']) { player.position.x -= delta * 2; moved = true; }
  if (keys['d']) { player.position.x += delta * 2; moved = true; }

  let timeFactor = slowMoTimer > 0 ? 0.3 : (moved ? 1 : 0.1);

  enemies.forEach(enemy => {
    let direction = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
    enemy.position.add(direction.multiplyScalar(delta * 1 * timeFactor));

    if (enemy.position.distanceTo(player.position) < 0.4) {
      deathSound.play();
      alert('YOU DIED! Refresh to Restart.');
      window.location.reload();
    }
  });

  renderer.render(scene, camera);
}

animate();
