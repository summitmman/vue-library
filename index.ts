// Import framework
import { ref, computed, mount } from './framework';

// Import stylesheets
import './style.css';

// Write TypeScript code!

mount('app', {
  template: `
    <h1>TypeScript Starter</h1>
    <h3>Price: {{ price }}</h3>
    <h3>Quantity: {{ quantity }}</h3>
    <button @click="onClick">Increase quantity</button>
    <button @click="onClickDecrease">Decrease quantity</button>
    <h3>Total: {{ total }}</h3>
  `,
  setup: () => {
    const price = ref(10);
    const quantity = ref(2);
    const total = computed<number>(() => {
      return price.value * quantity.value;
    });

    const onClick = (): void => {
      quantity.value = quantity.value + 1;
    };
    const onClickDecrease = (): void => {
      quantity.value = quantity.value - 1;
    };

    return {
      price,
      quantity,
      total,
      onClick,
      onClickDecrease,
    };
  },
});
