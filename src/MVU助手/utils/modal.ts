import { nextTick, reactive } from 'vue';

// 定义弹窗类型
type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  inputValue: string;
  placeholder: string;
  resolve: ((value: any) => void) | null;
}

// 响应式状态
export const modalState = reactive<ModalState>({
  visible: false,
  type: 'alert',
  title: '',
  message: '',
  inputValue: '',
  placeholder: '',
  resolve: null,
});

// 核心方法
export const Modal = {
  // 提示框 (替代 alert)
  alert(title: string, message: string): Promise<void> {
    return new Promise(resolve => {
      openModal('alert', title, message, '', '', resolve);
    });
  },

  // 确认框 (替代 confirm)
  confirm(title: string, message: string): Promise<boolean> {
    return new Promise(resolve => {
      openModal('confirm', title, message, '', '', resolve);
    });
  },

  // 输入框 (替代 prompt)
  prompt(
    title: string,
    message: string = '',
    defaultValue: string = '',
    placeholder: string = '',
  ): Promise<string | null> {
    return new Promise(resolve => {
      openModal('prompt', title, message, defaultValue, placeholder, resolve);
    });
  },
};

const pending: Array<Omit<ModalState, 'visible'>> = [];

function showNext() {
  if (modalState.visible) return;
  const request = pending.shift();
  if (request) Object.assign(modalState, request, { visible: true });
}

function openModal(
  type: ModalType,
  title: string,
  message: string,
  defaultValue: string,
  placeholder: string,
  resolve: (value: any) => void,
) {
  pending.push({ type, title, message, inputValue: defaultValue, placeholder, resolve });
  showNext();
}

export const closeModal = (result: any) => {
  const resolve = modalState.resolve;
  modalState.visible = false;
  modalState.resolve = null;
  resolve?.(result);
  void nextTick(showNext);
};
