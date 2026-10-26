#!/usr/bin/env python3
"""Minimal JVM class parser + bytecode dumper for one method.
Purpose: determine if KubeJS LoadedTexture.remap does exact map.get per pixel
or distance-based nearest matching. Authoritative: reads the shipped .class."""
import struct, sys, io

TAGS = {1:"Utf8",3:"Integer",4:"Float",5:"Long",6:"Double",7:"Class",8:"String",
        9:"Fieldref",10:"Methodref",11:"InterfaceMethodref",12:"NameAndType",
        15:"MethodHandle",16:"MethodType",17:"Dynamic",18:"InvokeDynamic",
        19:"Module",20:"Package"}

MNEMONIC = {
0:"nop",1:"aconst_null",2:"iconst_m1",3:"iconst_0",4:"iconst_1",5:"iconst_2",6:"iconst_3",
7:"iconst_4",8:"iconst_5",9:"lconst_0",10:"lconst_1",11:"fconst_0",12:"fconst_1",13:"fconst_2",
14:"dconst_0",15:"dconst_1",16:"bipush",17:"sipush",18:"ldc",21:"iload",22:"lload",23:"fload",
24:"dload",25:"aload",26:"iload_0",27:"iload_1",28:"iload_2",29:"iload_3",30:"lload_0",
31:"lload_1",32:"lload_2",33:"lload_3",34:"fload_0",35:"fload_1",36:"fload_2",37:"fload_3",
38:"dload_0",39:"dload_1",40:"dload_2",41:"dload_3",42:"aload_0",43:"aload_1",44:"aload_2",
45:"aload_3",46:"iaload",47:"laload",48:"faload",49:"daload",50:"aaload",51:"baload",
52:"caload",53:"saload",54:"istore",55:"lstore",56:"fstore",57:"dstore",58:"astore",
59:"istore_0",60:"istore_1",61:"istore_2",62:"istore_3",63:"lstore_0",64:"lstore_1",
65:"lstore_2",66:"lstore_3",67:"fstore_0",68:"fstore_1",69:"fstore_2",70:"fstore_3",
71:"dstore_0",72:"dstore_1",73:"dstore_2",74:"dstore_3",75:"astore_0",76:"astore_1",
77:"astore_2",78:"astore_3",79:"iastore",80:"lastore",81:"fastore",82:"dastore",83:"aastore",
84:"bastore",85:"castore",86:"sastore",87:"pop",88:"pop2",89:"dup",90:"dup_x1",91:"dup_x2",
92:"dup2",93:"dup2_x1",94:"dup2_x2",95:"swap",96:"iadd",97:"ladd",98:"fadd",99:"dadd",
100:"isub",101:"lsub",102:"fsub",103:"dsub",104:"imul",105:"lmul",106:"fmul",107:"dmul",
108:"idiv",109:"ldiv",110:"fdiv",111:"ddiv",112:"irem",113:"lrem",114:"frem",115:"drem",
116:"ineg",117:"lneg",118:"fneg",119:"dneg",120:"ishl",121:"lshl",122:"ishr",123:"lshr",
124:"iushr",125:"lushr",126:"iand",127:"land",128:"ior",129:"lor",130:"ixor",131:"lxor",
132:"iinc",133:"i2l",134:"i2f",135:"i2d",136:"l2i",137:"l2f",138:"l2d",139:"f2i",140:"f2l",
141:"f2d",142:"d2i",143:"d2l",144:"d2f",145:"i2b",146:"i2c",147:"i2s",148:"lcmp",149:"fcmpl",
150:"fcmpg",151:"dcmpl",152:"dcmpg",153:"ifeq",154:"ifne",155:"iflt",156:"ifge",157:"ifgt",
158:"ifle",159:"if_icmpeq",160:"if_icmpne",161:"if_icmplt",162:"if_icmpge",163:"if_icmpgt",
164:"if_icmple",165:"if_acmpeq",166:"if_acmpne",167:"goto",168:"jsr",169:"ret",
170:"tableswitch",171:"lookupswitch",172:"ireturn",173:"lreturn",174:"freturn",175:"dreturn",
176:"areturn",177:"return",178:"getstatic",179:"putstatic",180:"getfield",181:"putfield",
182:"invokevirtual",183:"invokespecial",184:"invokestatic",185:"invokeinterface",
186:"invokedynamic",187:"new",188:"newarray",189:"anewarray",190:"arraylength",
191:"athrow",192:"checkcast",193:"instanceof",194:"monitorenter",195:"monitorexit",
196:"wide",197:"multianewarray",198:"ifnull",199:"ifnonnull",200:"goto_w",201:"jsr_w"}

def parse(cp_offset_pool, f):
    pass

def main(path, wanted):
    data = open(path, "rb").read()
    r = io.BytesIO(data)
    assert r.read(4) == b"\xca\xfe\xba\xbe"
    r.read(2); r.read(2)  # minor, major
    n = struct.unpack(">H", r.read(2))[0]
    cp = [None] * n
    i = 1
    while i < n:
        tag = r.read(1)[0]
        if tag == 1:
            ln = struct.unpack(">H", r.read(2))[0]; cp[i] = ("Utf8", r.read(ln).decode("utf-8", "replace"))
        elif tag in (3, 4): cp[i] = ("num", struct.unpack(">I", r.read(4))[0])
        elif tag in (5, 6): cp[i] = ("num8", r.read(8)); i += 1
        elif tag == 7: cp[i] = ("Class", struct.unpack(">H", r.read(2))[0])
        elif tag == 8: cp[i] = ("String", struct.unpack(">H", r.read(2))[0])
        elif tag in (9, 10, 11):
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("Ref", tag, a, b)
        elif tag == 12:
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("NameAndType", a, b)
        elif tag == 15: cp[i] = ("MH", r.read(3))
        elif tag == 16: cp[i] = ("MT", struct.unpack(">H", r.read(2))[0])
        elif tag in (17, 18):
            a, b = struct.unpack(">HH", r.read(4)); cp[i] = ("Dyn", a, b)
        elif tag in (19, 20): cp[i] = ("Mod", struct.unpack(">H", r.read(2))[0])
        else: raise Exception(f"tag {tag}")
        i += 1

    def utf(idx): return cp[idx][1]
    def cls(idx): return utf(cp[idx][1])
    def nat(idx):
        t = cp[idx]; return f"{utf(t[1])}:{utf(t[2])}"
    def ref(idx):
        t = cp[idx]; return f"{cls(t[2])}.{nat(t[3])}"

    r.read(2)  # access
    r.read(2)  # this
    r.read(2)  # super
    ni = struct.unpack(">H", r.read(2))[0]; r.read(2 * ni)
    nf = struct.unpack(">H", r.read(2))[0]
    for _ in range(nf):
        r.read(2); r.read(2); r.read(2)
        na = struct.unpack(">H", r.read(2))[0]
        for _ in range(na):
            r.read(2)
            r.read(struct.unpack(">I", r.read(4))[0])
    nm = struct.unpack(">H", r.read(2))[0]
    for _ in range(nm):
        acc, namei, desi = struct.unpack(">HHH", r.read(6))
        name = utf(namei)
        na = struct.unpack(">H", r.read(2))[0]
        code = None
        for _ in range(na):
            ani = struct.unpack(">H", r.read(2))[0]
            alen = struct.unpack(">I", r.read(4))[0]
            body = r.read(alen)
            if utf(ani) == "Code":
                code = body
        if name in wanted and code:
            _, _, clen = struct.unpack(">HHI", code[:8])
            bc = code[8:8 + clen]
            print(f"\n### {name}{utf(desi)}  ({clen} bytes)")
            j = 0
            while j < len(bc):
                op = bc[j]
                m = MNEMONIC.get(op, f"?{op}")
                if op in (16,):  # bipush
                    print(f"{j:4} {m} {struct.unpack('>b', bc[j+1:j+2])[0]}"); j += 2
                elif op in (17,):  # sipush
                    print(f"{j:4} {m} {struct.unpack('>h', bc[j+1:j+3])[0]}"); j += 3
                elif op == 18:  # ldc
                    idx = bc[j+1]
                    e = cp[idx]
                    v = utf(e[1]) if e[0] in ("String", "Class") else str(e)
                    print(f"{j:4} ldc {v}"); j += 2
                elif op == 19:  # ldc_w (2-byte index)
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    e = cp[idx]
                    v = utf(e[1]) if e[0] in ("String", "Class") else str(e)
                    print(f"{j:4} ldc_w {v}"); j += 3
                elif op in (178, 179, 180, 181, 182, 183, 184):
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    print(f"{j:4} {m} {ref(idx)}"); j += 3
                elif op == 185:
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    print(f"{j:4} {m} {ref(idx)}"); j += 5
                elif op == 186:
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    print(f"{j:4} {m} #{idx}"); j += 5
                elif op in (153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,198,199):
                    off = struct.unpack(">h", bc[j+1:j+3])[0]
                    print(f"{j:4} {m} -> {j + off}"); j += 3
                elif op == 132:
                    a, b = struct.unpack(">bb", bc[j+1:j+3]); print(f"{j:4} iinc {a} {b}"); j += 3
                elif op == 196:  # wide
                    wop = bc[j+1]
                    if wop == 132:
                        a, b = struct.unpack(">Hh", bc[j+2:j+6]); print(f"{j:4} wide iinc {a} {b}"); j += 6
                    else:
                        a = struct.unpack(">H", bc[j+2:j+4])[0]; print(f"{j:4} wide {MNEMONIC.get(wop,wop)} {a}"); j += 4
                elif op == 197:  # multianewarray: index(2) + dims(1)
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    print(f"{j:4} multianewarray {cls(idx)}"); j += 4
                elif op in (200, 201):
                    off = struct.unpack(">i", bc[j+1:j+5])[0]
                    print(f"{j:4} {m} -> {j + off}"); j += 5
                elif op in (170, 171):
                    print(f"{j:4} {m} (switch)"); break
                elif op in (21, 22, 23, 24, 25, 54, 55, 56, 57, 58):
                    idx = bc[j+1]
                    print(f"{j:4} {m} {idx}"); j += 2
                elif op == 169:  # ret
                    print(f"{j:4} ret {bc[j+1]}"); j += 2
                elif op in (187, 189, 192, 193):
                    idx = struct.unpack(">H", bc[j+1:j+3])[0]
                    print(f"{j:4} {m} {cls(idx)}"); j += 3
                elif op in (46,47,48,49,50,51,52,53,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,
                            96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,
                            116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,
                            133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,
                            172,173,174,175,176,177,190,191,194,195,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
                            26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,
                            59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78):
                    print(f"{j:4} {m}"); j += 1
                else:
                    print(f"{j:4} {m}"); j += 1
if __name__ == "__main__":
    main(sys.argv[1], set(sys.argv[2:]))
