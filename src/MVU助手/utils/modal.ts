import { reactive } from 'vue';

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
  reject: (() => void) | null;
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
  reject: null
});

// 核心方法
export const Modal = {
  // 提示框 (替代 alert)
  alert(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      openModal('alert', title, message, '', '', resolve);
    });
  },

  // 确认框 (替代 confirm)
  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      openModal('confirm', title, message, '', '', resolve);
    });
  },

  // 输入框 (替代 prompt)
  prompt(title: string, message: string = '', defaultValue: string = '', placeholder: string = ''): Promise<string | null> {
    return new Promise((resolve) => {
      openModal('prompt', title, message, defaultValue, placeholder, resolve);
    });
  }
};

function openModal(
  type: ModalType,
  title: string,
  message: string,
  defaultValue: string,
  placeholder: string,
  resolve: (value: any) => void
) {
  modalState.type = type;
  modalState.title = title;
  modalState.message = message;
  modalState.inputValue = defaultValue;
  modalState.placeholder = placeholder;
  modalState.resolve = resolve;
  modalState.visible = true;
}

export const closeModal = (result: any) => {
  modalState.visible = false;
  if (modalState.resolve) {
    modalState.resolve(result);
    modalState.resolve = null;
  }
};
