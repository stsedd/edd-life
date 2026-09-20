const energySelector = document.getElementById('energySelector');
const energyBonus = document.getElementById('energyBonus');
const quickAdd = document.getElementById('quickAdd');
const toast = document.getElementById('toast');

const bonusByLevel = {
  1: '+40% XP',
  2: '+20% XP',
  3: '+10% XP',
  4: 'sem bônus',
  5: 'sem bônus'
};

if (energySelector) {
  energySelector.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-level]');
    if (!button) return;

    const level = Number(button.dataset.level);
    energySelector.querySelectorAll('button[data-level]').forEach((dot) => {
      const dotLevel = Number(dot.dataset.level);
      dot.classList.toggle('selected', dotLevel <= level);
    });

    energyBonus.textContent = `Energia ${level} · bônus atual: ${bonusByLevel[level]}`;
  });
}

document.querySelectorAll('.mood').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mood').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
  });
});

document.querySelectorAll('.task-check').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    checkbox.closest('tr')?.classList.toggle('done', checkbox.checked);
  });
});

if (quickAdd && toast) {
  quickAdd.addEventListener('click', () => {
    toast.hidden = false;
    window.clearTimeout(window.__eddToastTimer);
    window.__eddToastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  });
}
